#!/usr/bin/env python3
"""Offline validation of rules, module script declarations and locked dependencies."""
from pathlib import Path
import importlib.util
import ipaddress
import json
import re
import tempfile

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('collection_builder', ROOT / 'scripts/build-all-in-one.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

def split_rule(line):
    parts, start, depth = [], 0, 0
    for index, char in enumerate(line):
        if char == '(': depth += 1
        elif char == ')': depth -= 1
        elif char == ',' and depth == 0:
            parts.append(line[start:index].strip()); start = index + 1
    parts.append(line[start:].strip())
    return parts

ALLOWED = {'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-SET', 'RULE-SET', 'IP-CIDR', 'IP-CIDR6', 'IP-ASN', 'GEOIP', 'USER-AGENT', 'URL-REGEX', 'PROCESS-NAME', 'DEST-PORT', 'SRC-IP', 'PROTOCOL', 'AND', 'OR', 'NOT'}
def validate_rule(line, policy=False):
    parts = split_rule(line)
    if len(parts) < (3 if policy else 2) or any(not part for part in parts):
        raise ValueError('missing rule arguments')
    kind = parts[0]
    if kind not in ALLOWED: raise ValueError('unknown rule type')
    if kind in {'IP-CIDR', 'IP-CIDR6', 'SRC-IP'}:
        network = ipaddress.ip_network(parts[1], strict=False)
        if kind == 'IP-CIDR6' and network.version != 6: raise ValueError('expected IPv6')
        if kind == 'IP-CIDR' and network.version != 4: raise ValueError('expected IPv4')
    if kind == 'DEST-PORT':
        for port in parts[1].split('-'):
            if not 1 <= int(port) <= 65535: raise ValueError('invalid port')
    if kind == 'IP-ASN' and (not parts[1].isdigit() or int(parts[1]) <= 0): raise ValueError('invalid ASN')
    if kind in {'AND', 'OR', 'NOT'}:
        if not (parts[1].startswith('(') and parts[1].endswith(')')):
            raise ValueError('invalid logical condition')
        conditions = split_rule(parts[1][1:-1])
        if kind == 'NOT' and len(conditions) != 1: raise ValueError('NOT requires one condition')
        for condition in conditions:
            if not (condition.startswith('(') and condition.endswith(')')): raise ValueError('invalid nested rule')
            validate_rule(condition[1:-1])

errors = []
for path in (ROOT / 'rules').glob('*.list'):
    for index, raw in enumerate(path.read_text().splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith(('#', ';', '//')): continue
        try: validate_rule(line)
        except (ValueError, IndexError) as error: errors.append(f'{path.name}:{index}: {error}')

locks = json.loads((ROOT / 'scripts/external-scripts.lock.json').read_text())
locked = {(item['module'], item['url']) for item in locks}
for item in locks:
    if not item['pinned'] and not item.get('exception_reason'):
        errors.append(f"{item['module']}: unpinned dependency requires an explicit exception")
    if item['pinned'] and (not re.search(r'/[a-f0-9]{40}/', item['url']) or not re.fullmatch(r'[a-f0-9]{64}', item.get('sha256') or '')):
        errors.append(f"{item['module']}: invalid pinned dependency")
for path in (ROOT / 'modules').glob('*.sgmodule'):
    try:
        meta, sections = builder.parse_module(path)
        names = set()
        for line in sections.get('Rule', []):
            if line.strip() and not line.lstrip().startswith('#'): validate_rule(line, policy=True)
        for line in sections.get('Script', []):
            if not line.strip() or line.lstrip().startswith('#'): continue
            name = line.split('=', 1)[0].strip()
            if name in names: raise ValueError(f'duplicate script name: {name}')
            names.add(name)
            match = re.search(r'script-path=([^,\s]+)', line)
            if not match: raise ValueError(f'missing script-path: {name}')
            url = match[1]
            prefix = 'https://raw.githubusercontent.com/Havoooc/surge-rules/main/'
            if url.startswith(prefix):
                if not (ROOT / url[len(prefix):]).is_file(): raise ValueError('missing local script')
            elif path.name != 'all-in-one-adblock.sgmodule' and (path.name, url) not in locked:
                raise ValueError('untracked external script')
            if not url.startswith('https://'): raise ValueError('script must use HTTPS')
    except ValueError as error: errors.append(f'{path.name}: {error}')

# Negative examples prove the semantic validator actually rejects invalid input.
for invalid in ['DOMAIN', 'DOMAIN,,DIRECT', 'IP-CIDR,999.1.1.1/32', 'DEST-PORT,99999', 'IP-CIDR6,1.1.1.1/32', 'AND,((DEST-PORT,99999),(PROTOCOL,UDP))']:
    try: validate_rule(invalid)
    except ValueError: pass
    else: errors.append(f'validator accepted negative example: {invalid}')
for content in ['[Rule]\n[Rule]\n', '[Unsupported]\nfoo=bar\n', '[General]\nunknown=true\n']:
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.sgmodule') as sample:
        sample.write(content); sample.flush()
        try: builder.parse_module(sample.name, collection=True)
        except ValueError: pass
        else: errors.append('collection parser accepted unsupported input')
if errors: raise SystemExit('\n'.join(errors))
print('Rule and module semantic checks passed')
