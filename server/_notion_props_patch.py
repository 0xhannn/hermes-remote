P = r"C:\Users\Parhan\Dev\hermes-config-remote\server\hermes_brain_api.py"
data = open(P, "rb").read()
text = data.decode("utf-8").replace("\r\n", "\n")

HELPER = r'''def _notion_props_to_md(props):
    lines = []
    order = []
    for k, v in (props or {}).items():
        order.append((k, v))
    title_lines = []
    if "Name" in props:
        for t in props["Name"].get("title", []):
            title_lines.append(t.get("plain_text", ""))
    if title_lines:
        lines.append("# " + "".join(title_lines))
    for k, v in order:
        if k == "Name":
            continue
        typ = v.get("type")
        txt = ""
        if typ == "rich_text":
            txt = "".join(x.get("plain_text", "") for x in v.get("rich_text", []))
        elif typ == "title":
            txt = "".join(x.get("plain_text", "") for x in v.get("title", []))
        elif typ == "select":
            s = v.get("select"); txt = s.get("name", "") if s else ""
        elif typ == "status":
            s = v.get("status"); txt = s.get("name", "") if s else ""
        elif typ == "multi_select":
            txt = ", ".join(x.get("name", "") for x in v.get("multi_select", []))
        elif typ == "url":
            txt = v.get("url", "")
        elif typ == "number":
            n = v.get("number"); txt = str(n) if n is not None else ""
        elif typ == "date":
            dt = v.get("date"); txt = (dt.get("start", "") if dt else "")
        elif typ == "checkbox":
            txt = "true" if v.get("checkbox") else "false"
        elif typ == "people":
            names = []
            for p in v.get("people", []):
                names.append(p.get("name") or p.get("id", ""))
            txt = ", ".join(names)
        elif typ == "email":
            txt = v.get("email", "")
        elif typ == "phone_number":
            txt = v.get("phone_number", "")
        elif typ == "rollup":
            ro = v.get("rollup", {})
            if ro.get("type") == "array":
                arr = ro.get("array", [])
                parts = []
                for item in arr:
                    it = item.get("type")
                    if it == "rich_text":
                        parts.append("".join(x.get("plain_text", "") for x in item.get("rich_text", [])))
                    elif it == "people":
                        parts.append(", ".join(p.get("name") or p.get("id","") for p in item.get("people", [])))
                    elif it == "title":
                        parts.append("".join(x.get("plain_text","") for x in item.get("title", [])))
                    else:
                        val = item.get(it)
                        if isinstance(val, dict):
                            parts.append(val.get("name","") or "")
                        elif val is not None:
                            parts.append(str(val))
                txt = ", ".join(parts)
        if txt.strip():
            lines.append("- **" + k + ":** " + txt)
    return "\n".join(lines)
'''

marker = "def _notion_blocks_to_md(blocks):"
i = text.find(marker)
assert i != -1, "blocks def not found"
next_def = text.find("\ndef ", i + len(marker))
seg = text[i: next_def if next_def != -1 else len(text)]
last_return = seg.rfind("    return ")
assert last_return != -1, "return in blocks helper not found"
line_end = text.find("\n", i + last_return)
insert_at = line_end + 1
if "_notion_props_to_md" not in text:
    text = text[:insert_at] + "\n" + HELPER + "\n" + text[insert_at:]

old_page_block = r'''        if path == "/api/hermes/notion/page":
            pid = urllib.parse.parse_qs(parsed.query).get("id", [""])[0]
            cfg = _notion_load()
            if not cfg.get("token") or not pid:
                return self._send_json(400, {"success": False, "error": "Parameter id diperlukan"})
            st, res = _notion_api(cfg["token"], "GET", "blocks/" + pid + "/children?page_size=100")
            if st != 200:
                return self._send_json(st, {"success": False, "error": res.get("message")})
            md = _notion_blocks_to_md(res.get("results", []))
            return self._send_json(200, {"success": True, "markdown": md})
'''
new_page_block = r'''        if path == "/api/hermes/notion/page":
            pid = urllib.parse.parse_qs(parsed.query).get("id", [""])[0]
            cfg = _notion_load()
            if not cfg.get("token") or not pid:
                return self._send_json(400, {"success": False, "error": "Parameter id diperlukan"})
            st, res = _notion_api(cfg["token"], "GET", "pages/" + pid)
            if st != 200:
                return self._send_json(st, {"success": False, "error": res.get("message")})
            md = ""
            props = res.get("properties")
            if props:
                p_md = _notion_props_to_md(props)
                if p_md.strip():
                    md = p_md + "\n"
            st2, res2 = _notion_api(cfg["token"], "GET", "blocks/" + pid + "/children?page_size=100")
            if st2 == 200:
                b_md = _notion_blocks_to_md(res2.get("results", []))
                if b_md.strip():
                    md = md + "\n" + b_md
            return self._send_json(200, {"success": True, "markdown": md})
'''
if old_page_block not in text:
    print("WARN old page block NOT found — skip route replace")
else:
    text = text.replace(old_page_block, new_page_block, 1)

open(P, "wb").write(text.replace("\n", "\r\n").encode("utf-8"))
print("PATCH PROPS OK")
