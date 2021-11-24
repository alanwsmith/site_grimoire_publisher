#!/usr/bin/env node

// This is the process that moves files from the
// grimoire to the site along with setting up
// the config files to do the redirects when
// slugs change

const fs = require('fs')
const matter = require('gray-matter')

// const ksuidRedirectsInputFile = 'test_data/redirects/input.json'
// const ksuidRedirectsOutputFile = 'test_data/redirects/output.json'

// TODO: Update this so it deletes files before writing into the
// output directory.
// TODO: commit the site to git when the update happens.
//
//
// const inputDir =
//  '/Users/alans/workshop/site_content_ksuid_migration_data/06_renamed_files'
// const outputDir = '/Users/alans/workshop/alanwsmith.com/_posts'

// const ksuidRedirectsInputFile =
//   '/Users/alans/workshop/alanwsmith.com/data/ksuid-redirects-initial.json'

// const ksuidRedirectsInputFile =
//   '/Users/alans/workshop/alanwsmith.com/data/ksuid-redirects.json'

// const ksuidRedirectsOutputFile =
//   '/Users/alans/workshop/alanwsmith.com/data/ksuid-redirects.json'

const file_extension = /\.txt$/
const prefixRegex = /^\w+-\s+/g
const slugRegex = /[^\w\s]/g

// Define the configuration
const config = {
  dev: {
    inputDir: 'test_data/input',
    outputDir: 'test_data/output',
    // TODO: Can probably remove this
    // jsonRedirectFile: 'test_data/redirects/legacy_redirects.json',
    // ksuidMatcherFile: 'test_data/redirects/ksuid-matcher-file.json',
    legacySlugMapFile: 'legacy-slug-to-ksuid-map.json',
    legacySlugRedirectOutputFile:
      'test_data/redirects/legacy-slug-redirects.json',
    ksuidRedirectsInputFile: 'test_data/redirects/input.json',
    ksuidRedirectsOutputFile: 'test_data/redirects/output.json',
    // legacySlugsRedirectIdsInputFile: 'old_data/legacy-slug-redirect-ids.json',
    legacyRedirectMiddlewareFile:
      'test_data/redirects/legacy-redirect-middleware.js',
    activeRedictMiddlewereFile:
      'test_data/redirects/active-redirect-middleware.js',
    redirectsFile: 'test_data/redirects/_redirects',
  },
  prod: {
    inputDir: '/Users/alans/Dropbox/grimoire',
    outputDir: '/Users/alans/workshop/alanwsmith.com/_posts',
    //jsonRedirectFile:
    // '/Users/alans/workshop/alanwsmith.com/data/legacy_redirects.json',
    // ksuidMatcherFile:
    // '/Users/alans/workshop/alanwsmith.com/data/ksuid-matcher.json',
    legacySlugMapFile: 'legacy-slug-to-ksuid-map.json',
    legacyRedirectMiddlewareFile:
      '/Users/alans/workshop/alanwsmith.com/pages/_middleware.js',
    // legacySlugRedirectOutputFile:
    //'/Users/alans/workshop/alanwsmith.com/data/legacy-url-slug-to-ksuid-redirects.json',
    activeRedictMiddlewereFile:
      '/Users/alans/workshop/alanwsmith.com/pages/posts/_middleware.js',
    redirectsFile: '/Users/alans/workshop/alanwsmith.com/_redirects',
    ksuidRedirectsInputFile:
      '/Users/alans/workshop/alanwsmith.com/_ksuid_redirects.json',
    ksuidRedirectsOutputFile:
      '/Users/alans/workshop/alanwsmith.com/_ksuid_redirects.json',
  },
}

/////////////////////////////////////////////////////////////
// Set the environment
//
const currentEnv = 'dev'

// Setup counter to sanity check files
const fileCounts = {
  total: 0,
  containsId: 0,
  confirmedStatus: 0,
}

//////////////////////////////////////////
// Load the ksuidRedirects which deal with slug names changes

const ksuidRedirects = JSON.parse(
  fs.readFileSync(config[currentEnv].ksuidRedirectsInputFile)
)
console.log(ksuidRedirects)
// process.exit()

//////////////////////////////////////////
// Load in the list of legacy slugs and their matching KSUIDs

const legacySlugMap = JSON.parse(
  fs.readFileSync(config[currentEnv].legacySlugMapFile)
)
// console.log(legacySlugMap)

// // generate the new format for the map of legacy
// // url slugs to ksuids. This can be removed once the
// // tool has been run a few times to verify things
// // are working
// const legacySlugs = {}
// let legacySlugsCounter = 0
// const legacySlugRedirectIdsRaw = JSON.parse(
//   fs.readFileSync(config[currentEnv].legacySlugsRedirectIdsInputFile)
// )
// for (const ksuidKey in legacySlugRedirectIdsRaw['ksuid_redirects']) {
//   legacySlugParts =
//     legacySlugRedirectIdsRaw['ksuid_redirects'][ksuidKey].current_slug.split(
//       '/'
//     )
//   legacySlug = legacySlugParts[1]
//   legacySlugs[ksuidKey] = legacySlug
//   legacySlugsCounter += 1
// }
// fs.writeFileSync(
//   'legacy-slug-to-ksuid-map.json',
//   JSON.stringify(legacySlugs, null, 2)
// )
// console.log(legacySlugs)
// console.log(legacySlugsCounter)
// // console.log(legacySlugRedirectIdsRaw)

///////////////////////////////////////////////
// Get the files - this is the full list from the grimoire
const files = fs.readdirSync(config[currentEnv].inputDir)

////////////////////////////////////////////
// Holder for the legacy slug url to new ksuid map
const legacyUrlSlugToKSUIDMap = {}

/////////////////////////////////////////////////
// Clear existing files

const filesToClear = fs.readdirSync(config[currentEnv].outputDir)

filesToClear.forEach((fileToClear) => {
  const pathToClear = `${config[currentEnv].outputDir}/${fileToClear}`
  console.log(`Clearing: ${pathToClear}`)
  fs.unlinkSync(pathToClear)
})

// process.exit()

///////////////////////////////////////////////
// variable to hold data for active redirect middleware
const activeUrlSlugRedirects = {}

/////////////////////////////////////////////
// Loop through all the files in the grimoire
files.forEach((filename) => {
  // console.log(`Processing: ${filename}`)
  if (filename.match(file_extension)) {
    fileCounts.total += 1
    const inputPath = `${config[currentEnv].inputDir}/${filename}`

    let parts = ''

    try {
      parts = matter.read(inputPath)
    } catch (err) {
      console.log(err)
      console.log(`In file: ${filename}`)
    }

    // TODO Figure out what happens if there's no data returned.

    // Only process if there's an id
    if (parts.data.id) {
      fileCounts.containsId += 1
      console.log(`-- Found ID: ${parts.data.id}`)

      // Update the title frontmatter if one
      // doesn't already exist (which it shouldn't
      // unless you're doing an override)
      // NOTE: This does not go back into the grimoire
      // it's only for the site framework version.
      if (!parts.data.title) {
        parts.data.title = filename
          .replaceAll(prefixRegex, '')
          .replaceAll('.txt', '')
      }

      // Make the slug based off the title frontmatter
      // that has just been updated or has an override
      // in it.
      const baseSlug =
        parts.data.id +
        `--` +
        parts.data.title
          .replaceAll(prefixRegex, '')
          .replaceAll(slugRegex, '')
          .replaceAll(' ', '-')
          .toLowerCase()
      // console.log(slug)

      // this is what's used in the referencing
      const urlSlug = `/posts/${baseSlug}`

      // Add the mapping to the active slugs
      activeUrlSlugRedirects[parts.data.id] = urlSlug

      // Add the mapping for the legacy URL
      if (legacySlugMap[parts.data.id]) {
        legacyUrlSlugToKSUIDMap[legacySlugMap[parts.data.id]] = urlSlug
      }

      // Add the slug into the frontmatter
      // TODO: See if you can remove the slug.
      // I think you should be able to
      // parts.data.slug = slug

      // Create the output path an assembe the file
      const outputPath = `${config[currentEnv].outputDir}/${baseSlug}.mdx`
      const fileContents = matter.stringify(parts.content, parts.data)
      // console.log(outputPath)

      // only publish things that match the proper status
      if (parts.data.status.match(/^(archive|scratch|draft|published)$/)) {
        fileCounts.confirmedStatus += 1
        // Write the file out
        fs.writeFile(outputPath, fileContents, (err) => {
          if (err) throw err
          // console.log(`Wrote: ${outputPath}`)
        })

        // Add the page to the redirects file if it's new
        if (ksuidRedirects.ksuid_redirects[parts.data.id] === undefined) {
          ksuidRedirects.ksuid_redirects[parts.data.id] = {
            current_slug: urlSlug,
            slugs_to_redirect: [],
          }
        }

        // Update if it's changed and push the prior onto the list of
        // slugs to redicts
        else if (
          ksuidRedirects.ksuid_redirects[parts.data.id].current_slug !== urlSlug
        ) {
          ksuidRedirects.ksuid_redirects[parts.data.id].slugs_to_redirect.push(
            ksuidRedirects.ksuid_redirects[parts.data.id].current_slug
          )
          ksuidRedirects.ksuid_redirects[parts.data.id].current_slug = urlSlug
        }

        // make an object that holds all the necessary redirects

        // // Add the data to the rewrites
        // urlRewrites.push({
        //   source: `/posts/${slug}`,
        //   destination: `/posts/${parts.data.id}`,
        // })
      }
    }
  }
})

const redirectLines = []
for (const redirectSet in legacyUrlSlugToKSUIDMap) {
  redirectLines.push(
    `/${redirectSet}    ${legacyUrlSlugToKSUIDMap[redirectSet]}    301`
  )
}

console.log(redirectLines)

fs.writeFileSync(config[currentEnv].redirectsFile, redirectLines.join('\n'))

/////////////////////////////////////////////////////////////////////
//// Write out to the posts level middlesware active id to slug redirect:
//const activeUrlSlugRedirectContent = `
//import { NextResponse, NextFetchEvent, NextRequest } from 'next/server'
//export function middleware(req) {
//  console.log(req.nextUrl.pathname)
//  const currentSlugs = ${JSON.stringify(activeUrlSlugRedirects, null, 2)}
//  const pathParts = req.nextUrl.pathname.split('/')
//  if (pathParts.length === 3) {
//    const slugParts = pathParts[2].split('--')
//    console.log(slugParts[0])
//    if (currentSlugs[slugParts[0]]) {
//      if (currentSlugs[slugParts[0]] !== req.nextUrl.pathname) {
//        return NextResponse.redirect(currentSlugs[slugParts[0]])
//      }
//    }
//  }
//  if (req.nextUrl.pathname === '/posts/asdfasdf') {
//    return NextResponse.redirect('/')
//  }
//}
//`
//fs.writeFileSync(
//  config[currentEnv].activeRedictMiddlewereFile,
//  activeUrlSlugRedirectContent
//)

///////////////////////////////////////////////////////////////////
// // Write out the to top level _middleware file to redirect legacy URLs
// const legacyRedirectMiddlewareContents = `
// import { NextResponse, NextFetchEvent, NextRequest } from 'next/server'
// export function middleware(req) {
//   console.log("-- Top level _middleware: Started")
//   console.log("-- Top level _middleware: Initial path: " + req.nextUrl.pathname)
//   const currentSlugs = ${JSON.stringify(legacyUrlSlugToKSUIDMap, null, 2)}
//   const pathParts = req.nextUrl.pathname.split('/')
//   if (pathParts.length === 2) {
//     if (currentSlugs[pathParts[1]]) {
//       console.log('-- Top level _middleware Redirecting to: ' + currentSlugs[pathParts[1]])
//       return NextResponse.redirect(currentSlugs[pathParts[1]])
//     }
//   }
// }
// `
// fs.writeFileSync(
//   config[currentEnv].legacyRedirectMiddlewareFile,
//   legacyRedirectMiddlewareContents
// )

console.log(
  `Total: ${fileCounts.total} - IDs: ${fileCounts.containsId} - Published: ${fileCounts.confirmedStatus}`
)

// fs.writeFileSync(
//   config[currentEnv].legacySlugRedirectOutputFile,
//   JSON.stringify(legacyUrlSlugToKSUIDMap, null, 2)
// )

// console.log(legacyUrlSlugToKSUIDMap)

// shouldn't need this any more when you have hte
// json setup for the pages/posts/_middleware
// // Write out the redirects storage

fs.writeFileSync(
  config[currentEnv].ksuidRedirectsOutputFile,
  JSON.stringify(ksuidRedirects, null, 2)
)

// const redirectArray = []

// This is the one off file that needs to setup for the first load
// once things are all in place, it should be removed.

// const redirectKeys = {}
// for (const ksuid in ksuidRedirects.ksuid_redirects) {
//   console.log(ksuid)
//   destination_slug = ksuidRedirects.ksuid_redirects[ksuid].current_slug
//   ksuidRedirects.ksuid_redirects[ksuid].slugs_to_redirect.forEach(
//     (source_slug) => {
//       redirectKeys[source_slug.substring(1)] = destination_slug
//       // redirectArray.push(tmpObject)
//     }
//   )
// }
// configOutput = JSON.stringify(redirectKeys, null, 2)
// fs.writeFileSync(config[currentEnv].jsonRedirectFile, configOutput)

// This is the part the outputs for the KSUIDs so that
// paths always redict to the most current slug for the
// ID.

/// This is the matcher that you might need to add back in
// const tsuidMatcher = {}
// for (const ksuid in ksuidRedirects.ksuid_redirects) {
//   const pathParts =
//     ksuidRedirects.ksuid_redirects[ksuid].current_slug.split('/')
//   slugParts = pathParts[2].split('--')
//   ksuidMatcher[slugParts[0]] =
//     ksuidRedirects.ksuid_redirects[ksuid].current_slug
// }
// fs.writeFileSync(
//   config[currentEnv].ksuidMatcherFile,
//   JSON.stringify(ksuidMatcher, null, 2)
// )

// console.log(JSON.stringify(redirectArray, null, 2))
// console.log(urlRewrites)
// console.log(JSON.stringify(ksuidRedirects))
