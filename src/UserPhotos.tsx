import type {StepId} from './flow'
import skin from './assets/user-photos/skin-to-skin.jpg'
import preparation from './assets/user-photos/preparation.jpg'
import newborn from './assets/user-photos/newborn.jpg'
import birthCare from './assets/user-photos/birth-care.jpg'

// User-provided photos. They illustrate the context, not clinical findings.
const photos={
 skin:{src:skin,alt:'Neonato a contatto con il torace di un adulto',position:'65% 50%'},
 preparation:{src:preparation,alt:'Personale sanitario con tablet, appunti e stetoscopio',position:'50% 50%'},
 newborn:{src:newborn,alt:'Mano di un neonato che stringe il dito di un adulto',position:'50% 65%'},
 birthCare:{src:birthCare,alt:'Assistenza a un neonato alla nascita',position:'55% 60%'}
}
export const stepPhotos:Partial<Record<StepId,keyof typeof photos>>={preparation:'preparation',birth:'birthCare',cord:'birthCare',skin:'skin','first-actions':'birthCare','recovery-review':'newborn',post:'newborn'}
export function UserPhoto({name,className=''}:{name:keyof typeof photos;className?:string}){
 const photo=photos[name]
 return <img className={`user-photo block size-full min-h-0 max-h-none object-cover [.case-art_&]:rounded-[inherit] ${className}`} src={photo.src} alt={photo.alt} style={{objectPosition:photo.position}}/>
}
