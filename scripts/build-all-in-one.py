#!/usr/bin/env python3
"""
自动根据 modules/ 下的独立模块生成 all-in-one-adblock.sgmodule 合集。
排除 all-in-one-adblock.sgmodule 本身及独立的 youtube-feed-adblock.sgmodule。
"""
import os
import re
import glob
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
MODULES_DIR = os.path.join(REPO_ROOT, "modules")
OUTPUT_FILE = os.path.join(MODULES_DIR, "all-in-one-adblock.sgmodule")

EXCLUDE_MODULES = {
    "all-in-one-adblock.sgmodule",
    "youtube-feed-adblock.sgmodule"
}

def clean_block(lines):
    """去除首尾多余空行，但保留内部注释和规则。"""
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return lines

def parse_module(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    meta = {}
    sections = {}
    current_section = None
    cur_lines = []

    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("#!"):
            m = re.match(r"^#!([^=]+)=(.*)$", stripped)
            if m:
                meta[m.group(1).strip()] = m.group(2).strip()
            continue

        sec_match = re.match(r"^\[([a-zA-Z0-9 _-]+)\]", stripped)
        if sec_match:
            if current_section:
                sections[current_section] = clean_block(cur_lines)
            current_section = sec_match.group(1).strip()
            cur_lines = []
            continue

        if current_section is not None:
            cur_lines.append(line)

    if current_section:
        sections[current_section] = clean_block(cur_lines)

    return meta, sections

def build():
    module_files = sorted(glob.glob(os.path.join(MODULES_DIR, "*.sgmodule")))
    parsed = []

    for path in module_files:
        fname = os.path.basename(path)
        if fname in EXCLUDE_MODULES:
            continue
        meta, sections = parse_module(path)
        name = meta.get("name", fname)
        parsed.append((fname, name, meta, sections))

    general_skip_proxy = set()
    general_always_real_ip = set()
    mitm_hosts = []

    rules_by_module = []
    rewrites_by_module = []
    map_locals_by_module = []
    body_rewrites_by_module = []
    scripts_by_module = []

    for fname, name, meta, sections in parsed:
        # General
        if "General" in sections:
            for l in sections["General"]:
                stripped = l.strip()
                if stripped.startswith("skip-proxy"):
                    parts = stripped.split("=", 1)[1].replace("%APPEND%", "").split(",")
                    for p in parts:
                        p = p.strip()
                        if p:
                            general_skip_proxy.add(p)
                elif stripped.startswith("always-real-ip"):
                    parts = stripped.split("=", 1)[1].replace("%APPEND%", "").split(",")
                    for p in parts:
                        p = p.strip()
                        if p:
                            general_always_real_ip.add(p)

        # Rule
        if "Rule" in sections and sections["Rule"]:
            block = []
            for l in sections["Rule"]:
                block.append(l)
            rules_by_module.append((name, block))

        # URL Rewrite
        if "URL Rewrite" in sections and sections["URL Rewrite"]:
            rewrites_by_module.append((name, sections["URL Rewrite"]))

        # Map Local
        if "Map Local" in sections and sections["Map Local"]:
            map_locals_by_module.append((name, sections["Map Local"]))

        # Body Rewrite
        if "Body Rewrite" in sections and sections["Body Rewrite"]:
            body_rewrites_by_module.append((name, sections["Body Rewrite"]))

        # Script
        if "Script" in sections and sections["Script"]:
            cleaned_scripts = []
            for l in sections["Script"]:
                # 统一贴吧参数名
                l = l.replace("{{{隐藏推荐页视频帖子}}}", "{{{贴吧隐藏推荐页视频帖子}}}")
                cleaned_scripts.append(l)
            scripts_by_module.append((name, cleaned_scripts))

        # MITM
        if "MITM" in sections:
            for l in sections["MITM"]:
                stripped = l.strip()
                if stripped.startswith("hostname"):
                    parts = stripped.split("=", 1)[1].replace("%APPEND%", "").split(",")
                    for p in parts:
                        p = p.strip()
                        if p and p not in mitm_hosts:
                            mitm_hosts.append(p)

    out = []
    today = datetime.now().strftime("%Y-%m-%d")
    out.append("#!name=Havoc全能去广告合集")
    out.append("#!desc=整合仓库内去广告模块、HTTPDNS 稳妥拦截与国内银行 VPN 兼容；保留独立模块以便排错和回退。")
    out.append("#!author=Havoooc")
    out.append("#!category=去广告")
    out.append("#!homepage=https://github.com/Havoooc/surge-rules")
    out.append("#!icon=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Advertising.png")
    out.append(f"#!date={today}")
    out.append("#!arguments=贴吧隐藏推荐页视频帖子:false")
    out.append("#!arguments-desc=- 贴吧隐藏推荐页视频帖子：[true, false]，默认关闭。")
    out.append("")

    # 1. General
    out.append("[General]")
    out.append("# 国内银行 VPN 兼容 General 部分：多个国内 App 共用的网络连通性检测")
    out.append("# 包括中行缤纷生活、光大及部分地方银行场景；建行、中国银行和交通银行使用公开配置中反复出现的银行域名后缀")
    sorted_skip = sorted(general_skip_proxy)
    out.append(f"skip-proxy = %APPEND% {', '.join(sorted_skip)}")
    out.append("# 避免运营商登录及部分金融 App 域名受到 Fake-IP 影响")
    out.append("# 平安和招商银行仅加入 always-real-ip，不跳过规则策略，也不拦截业务接口")
    sorted_real_ip = sorted(general_always_real_ip)
    out.append(f"always-real-ip = %APPEND% {', '.join(sorted_real_ip)}")
    out.append("")

    # 2. Rule
    out.append("[Rule]")
    for mod_name, lines in rules_by_module:
        out.append(f"# > {mod_name}")
        out.extend(lines)
        out.append("")

    # 3. URL Rewrite
    if rewrites_by_module:
        out.append("[URL Rewrite]")
        for mod_name, lines in rewrites_by_module:
            out.append(f"# > {mod_name}")
            out.extend(lines)
            out.append("")

    # 4. Map Local
    if map_locals_by_module:
        out.append("[Map Local]")
        for mod_name, lines in map_locals_by_module:
            out.append(f"# > {mod_name}")
            out.extend(lines)
            out.append("")

    # 5. Body Rewrite
    if body_rewrites_by_module:
        out.append("[Body Rewrite]")
        for mod_name, lines in body_rewrites_by_module:
            out.append(f"# > {mod_name}")
            out.extend(lines)
            out.append("")

    # 6. Script
    if scripts_by_module:
        out.append("[Script]")
        for mod_name, lines in scripts_by_module:
            out.append(f"# > {mod_name}")
            out.extend(lines)
            out.append("")

    # 7. MITM
    out.append("[MITM]")
    out.append(f"hostname = %APPEND% {', '.join(mitm_hosts)}")
    out.append("")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

    print(f"✅ Successfully compiled {OUTPUT_FILE}")
    print(f"   Modules included: {len(parsed)}")
    print(f"   Total lines: {len(out)}")
    print(f"   MITM hostnames: {len(mitm_hosts)}")

if __name__ == "__main__":
    build()
