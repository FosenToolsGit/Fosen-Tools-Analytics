# Uskarper roterbare områder (flaska) med myk kant.
# Region: [cx, cy, bredde, høyde, vinkel] — avrundet rektangel (dekker jevnt).
import sys, json, os
from PIL import Image, ImageDraw, ImageFilter

def blur_omraade(src, dst, regioner, styrke=None):
    im = Image.open(src).convert("RGB")
    W, H = im.size
    r = styrke or max(W, H) // 50
    blurred = im.filter(ImageFilter.GaussianBlur(r))
    mask = Image.new("L", (W, H), 0)
    for (cx, cy, bw, bh, ang) in regioner:
        pad = 300
        lag = Image.new("L", (int(bw)+2*pad, int(bh)+2*pad), 0)
        ImageDraw.Draw(lag).rounded_rectangle(
            [pad, pad, pad+bw, pad+bh], radius=int(min(bw,bh)*0.45), fill=255)
        lag = lag.rotate(ang, expand=True, resample=Image.BICUBIC)
        lag = lag.filter(ImageFilter.GaussianBlur(max(24, r//2)))
        mask.paste(lag, (int(cx-lag.width/2), int(cy-lag.height/2)), lag)
    im.paste(blurred, (0,0), mask)
    im.save(dst, quality=93, subsampling=0)

if __name__ == "__main__":
    plan = json.load(open(sys.argv[1]))
    D, UT = sys.argv[2], sys.argv[3]
    os.makedirs(UT, exist_ok=True)
    for navn, reg in plan.items():
        blur_omraade(os.path.join(D,navn), os.path.join(UT,navn), reg)
        print("✓", navn)
