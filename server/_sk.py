import json, urllib.request, io

def get(url):
    req = urllib.request.Request(url, headers={"X-Hermes-PIN":"123456"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

base = "http://127.0.0.1:8096/api/hermes/notion/page_blocks?id="
KW = ("sub-brand","router","avatar","canvas","1024","master")

def flat(blk, depth, out):
    t = blk.get("type")
    txt = ""
    for s in (blk.get("rt") or []):
        txt += s.get("t","")
    has_kw = any(k in txt.lower() for k in KW)
    out.append((depth, t, has_kw, txt, bool(blk.get("children"))))
    for ch in (blk.get("children") or []):
        flat(ch, depth+1, out)

at = get(base+"3fc2bdcd-c241-8051-85e4-f56319db52ce")
for cp in at["blocks"]:
    if cp["type"] != "child_page": continue
    try:
        d = get(base+cp["id"])
    except Exception as e:
        continue
    out=[]
    for b in d.get("blocks", []):
        flat(b,0,out)
    kw = [o for o in out if o[2]]
    childdrop = [o for o in out if o[4] and o[1] in ("paragraph","heading_1","heading_2","heading_3","heading_4","child_page")]
    if kw or childdrop:
        print("=== "+cp["title"]+" ===")
        for o in kw[:8]:
            print("  KW[d%d/%s/children=%s] %s" % (o[0],o[1],o[4],o[3][:80]))
        for o in childdrop[:8]:
            print("  DROP[d%d/%s/children=%s] %s" % (o[0],o[1],o[4],o[3][:60]))
