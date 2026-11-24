import sys
from PIL import Image
out=sys.argv[1]; fs=sys.argv[2:]
ims=[Image.open(f) for f in fs]; s=2
w=sum(i.width//s+10 for i in ims); h=max(i.height//s for i in ims)
c=Image.new('RGB',(w,h),'white'); x=0
for i in ims: c.paste(i.resize((i.width//s,i.height//s)),(x,0)); x+=i.width//s+10
c.save(out)
