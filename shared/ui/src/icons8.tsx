import {useId, type SVGProps} from 'react'
import icon0 from "./icons8-assets/11658.png"
import icon1 from "./icons8-assets/11676.png"
import icon2 from "./icons8-assets/11695.png"
import icon3 from "./icons8-assets/120374.png"
import icon4 from "./icons8-assets/123858.png"
import icon5 from "./icons8-assets/1395.png"
import icon6 from "./icons8-assets/1414.png"
import icon7 from "./icons8-assets/14735.png"
import icon8 from "./icons8-assets/1ywhPHT9sgZB.png"
import icon9 from "./icons8-assets/2090.png"
import icon10 from "./icons8-assets/2795.png"
import icon11 from "./icons8-assets/355.png"
import icon12 from "./icons8-assets/357.png"
import icon13 from "./icons8-assets/366.png"
import icon14 from "./icons8-assets/37802.png"
import icon15 from "./icons8-assets/3979.png"
import icon16 from "./icons8-assets/400.png"
import icon17 from "./icons8-assets/46.png"
import icon18 from "./icons8-assets/5353.png"
import icon19 from "./icons8-assets/5355.png"
import icon20 from "./icons8-assets/6509.png"
import icon21 from "./icons8-assets/6902.png"
import icon22 from "./icons8-assets/742.png"
import icon23 from "./icons8-assets/77.png"
import icon24 from "./icons8-assets/956.png"
import icon25 from "./icons8-assets/962.png"
import icon26 from "./icons8-assets/9659.png"
import icon27 from "./icons8-assets/HquP7TI2ej2Z.png"
import icon28 from "./icons8-assets/MM--xPq8Af1V.png"
import icon29 from "./icons8-assets/NZ6xJ1MPsUMH.png"
import icon30 from "./icons8-assets/OEOE_cGkfKPr.png"
import icon31 from "./icons8-assets/S4uQPzcYuUUQ.png"
import icon32 from "./icons8-assets/TSBeKJdyf0P3.png"
import icon33 from "./icons8-assets/tuW6n6tWOHYh.png"

type IconProps = SVGProps<SVGSVGElement> & {size?: number | string}
function makeIcon(src: string) {
  return function Icons8Icon({size = 24, width = size, height = size, children, ...props}: IconProps) {
    const maskId = `icons8-${useId().replace(/:/g, '')}`
    return <svg width={width} height={height} viewBox="0 0 256 256" fill="none" aria-hidden="true" focusable="false" {...props}>
      <defs><mask id={maskId} style={{maskType: 'alpha'}}><image href={src} width="256" height="256" /></mask></defs>
      <rect width="256" height="256" fill="currentColor" mask={`url(#${maskId})`} />
      {children}
    </svg>
  }
}

export const Activity = makeIcon(icon24)
export const ClipboardList = makeIcon(icon15)
export const Clock3 = makeIcon(icon21)
export const FileText = makeIcon(icon5)
export const Menu = makeIcon(icon3)
export const PhoneCall = makeIcon(icon26)
export const RotateCcw = makeIcon(icon1)
export const Thermometer = makeIcon(icon14)
export const Volume2 = makeIcon(icon10)
export const Square = makeIcon(icon16)
export const ArrowRight = makeIcon(icon11)
export const ArrowLeft = makeIcon(icon12)
export const ExternalLink = makeIcon(icon22)
export const Check = makeIcon(icon2)
export const CheckIcon = makeIcon(icon2)
export const CheckCircle2 = makeIcon(icon0)
export const X = makeIcon(icon17)
export const XIcon = makeIcon(icon17)
export const Info = makeIcon(icon23)
export const Download = makeIcon(icon13)
export const Maximize2 = makeIcon(icon20)
