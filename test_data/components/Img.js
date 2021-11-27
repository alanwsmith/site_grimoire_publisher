import Image from 'next/image'

import black_widow_20051026_230734a1 from '../_images/black_widow_20051026_230734a1.jpg'
import command_line_ls_2009_04 from '../_images/command_line_ls_2009_04.png'
import iphone_3gs_test_photo_2009_06 from '../_images/iphone_3gs_test_photo_2009_06.jpg'
import mile_200000_20080402_snaps_0039 from '../_images/mile_200000_20080402_snaps_0039.jpg'
import sunset_in_key_weat_20060211_191750a from '../_images/sunset_in_key_weat_20060211_191750a.jpg'
import wedding_dance_20080301_0965 from '../_images/wedding_dance_20080301_0965.jpg'
import wireless_flash_mod_20060430_234118a from '../_images/wireless_flash_mod_20060430_234118a.jpg'

const imgMap = {
  black_widow_20051026_230734a1: black_widow_20051026_230734a1,
  command_line_ls_2009_04: command_line_ls_2009_04,
  iphone_3gs_test_photo_2009_06: iphone_3gs_test_photo_2009_06,
  mile_200000_20080402_snaps_0039: mile_200000_20080402_snaps_0039,
  sunset_in_key_weat_20060211_191750a: sunset_in_key_weat_20060211_191750a,
  wedding_dance_20080301_0965: wedding_dance_20080301_0965,
  wireless_flash_mod_20060430_234118a: wireless_flash_mod_20060430_234118a,
}

export default function Img({ src, alt = 'image alt text unavailable' }) { 
 return <Image src={imgMap[src]} alt={alt} /> 
}