
import { NextResponse, NextFetchEvent, NextRequest } from 'next/server'

export function middleware(req) {
  console.log("-- Top level _middleware: Started")
  console.log("-- Top level _middleware: Initial path: " + req.nextUrl.pathname)
  const currentSlugs = {
  "200000": "/posts/20eMJEMIINBl--200000",
  "join-a-table-into-a-string-in-lua": "/posts/20eOCGsLb6si--join-a-table-into-a-string-in-lua",
  "jack-as-jake": "/posts/20eLGDcxpBhK--jake-as-jake--a-review"
}

  const pathParts = req.nextUrl.pathname.split('/')
  if (pathParts.length === 2) {
    if (currentSlugs[pathParts[1]]) {
      console.log('-- Top level _middleware Redirecting to: ' + currentSlugs[pathParts[1]])
      return NextResponse.redirect(currentSlugs[pathParts[1]])
    }
  }
}
