
import { NextResponse, NextFetchEvent, NextRequest } from 'next/server'

export function middleware(req) {
  console.log(req.nextUrl.pathname)

  const currentSlugs = {
  "20eOa3LJM1Jy": "/posts/20eOa3LJM1Jy--delete-old-files",
  "20eOCGsLb6si": "/posts/20eOCGsLb6si--join-a-table-into-a-string-in-lua",
  "20eMJEMIINBl": "/posts/20eMJEMIINBl--200000",
  "20eLGDcxpBhK": "/posts/20eLGDcxpBhK--jake-as-jake--a-review"
}

  const pathParts = req.nextUrl.pathname.split('/')
  if (pathParts.length === 3) {
    const slugParts = pathParts[2].split('--')
    console.log(slugParts[0])
    if (currentSlugs[slugParts[0]]) {
      if (currentSlugs[slugParts[0]] !== req.nextUrl.pathname) {
        return NextResponse.redirect(currentSlugs[slugParts[0]])
      }
    }
  }

  if (req.nextUrl.pathname === '/posts/asdfasdf') {
    return NextResponse.redirect('/')
  }
}
