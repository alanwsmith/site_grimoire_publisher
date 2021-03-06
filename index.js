#!/usr/bin/env node

// This is the process that moves files from the grimoire
// to the site along with setting up the config files to
// do the redirects when slugs change
//
// There's a good chance lots of this code can be removed.
// Just need to walk through it to figure out what's what.
//
//
// TODO: Make sure to explicty filter out work stuff too
//// as a secondary protection.

const axios = require('axios')
const fs = require('fs')
const matter = require('gray-matter')

const file_extension = /\.txt$/
const prefixRegex = /^\w+-\s+/g
const slugRegex = /[^\w\s]/g

const config = {
  dev: {
    inputDir: 'test_data/input',
    outputDir: 'test_data/output',

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
    imageFile: 'test_data/components/Img.js',
    // The first path is the main one, the second is to try to get google
    // to work.
    podcastRssOutputPath: 'test_data/thepodofalan.xml',
    podcastRssOutputPathGoogle: 'test_data/thepodofalan-google.xml',
  },
  prod: {
    inputDir: '/Users/alan/Library/Mobile Documents/com~apple~CloudDocs/Grimoire',
    outputDir: '/Users/alan/workshop/alanwsmith.com/_posts',

    legacySlugMapFile: 'legacy-slug-to-ksuid-map.json',
    legacyRedirectMiddlewareFile:
      '/Users/alan/workshop/alanwsmith.com/pages/_middleware.js',
    // legacySlugRedirectOutputFile:
    //'/Users/alan/workshop/alanwsmith.com/data/legacy-url-slug-to-ksuid-redirects.json',

    activeRedictMiddlewereFile:
      '/Users/alan/workshop/alanwsmith.com/pages/posts/_middleware.js',
    redirectsFile: '/Users/alan/workshop/alanwsmith.com/_data/_redirects',
    ksuidRedirectsInputFile:
      '/Users/alan/workshop/alanwsmith.com/_data/_ksuid_redirects.json',
    ksuidRedirectsOutputFile:
      '/Users/alan/workshop/alanwsmith.com/_data/_ksuid_redirects.json',
    imageFile: '/Users/alan/workshop/alanwsmith.com/components/Img.js',
    // The first path is the main one, the second is to try to get google
    // to work.
    podcastRssOutputPath:
      '/Users/alan/workshop/alanwsmith.com/public/thepodofalan.xml',
    podcastRssOutputPathGoogle:
      '/Users/alan/workshop/alanwsmith.com/public/thepodofalan-google.xml',
  },
}

/////////////////////////////////////////////////////////////
// Set the environment

const currentEnv = 'prod'

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

// const legacySlugMap = JSON.parse(
//   fs.readFileSync(config[currentEnv].legacySlugMapFile)
// )

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
  if (filename.match(/tour-/g)) {
    return
  }
  if (filename.match(/data-/g)) {
    return
  }

  // TODO: Set this up to whitelist file names

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
      const lowercaseId = parts.data.id.toLowerCase()
      fileCounts.containsId += 1
      console.log(`-- Found ID: ${lowercaseId}`)

      // Update the title frontmatter if one
      // doesn't already exist (which it shouldn't
      // unless you're doing an override)
      // NOTE: This does not go back into the grimoire
      // it's only for the site framework version.
      if (!parts.data.title) {
        parts.data.title = filename
          .replaceAll(prefixRegex, '')
          // TODO - Remove trailing spaces here
          .replaceAll('.txt', '')
      }

      // Make the slug based off the title frontmatter
      // that has just been updated or has an override
      // in it.
      const baseSlug =
        lowercaseId +
        `--` +
        parts.data.title
          .replaceAll(prefixRegex, '')
          .replaceAll(slugRegex, '')
          .replaceAll(' ', '-')
          .toLowerCase()

      // this is what's used in the referencing
      const urlSlug = `/posts/${baseSlug}`

      // add the slug to the frontmatter so it can be used
      // in the og:url
      parts.data.slug = urlSlug

      // Add the mapping to the active slugs
      activeUrlSlugRedirects[lowercaseId] = urlSlug

      // Add the mapping for the legacy URL
      // This should no longer be needed after the first run (i think...)
      // if (legacySlugMap[lowercaseId]) {
      // legacyUrlSlugToKSUIDMap[legacySlugMap[lowercaseId]] = urlSlug
      // }

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
        if (ksuidRedirects.ksuid_redirects[lowercaseId] === undefined) {
          ksuidRedirects.ksuid_redirects[lowercaseId] = {
            current_slug: urlSlug,
            slugs_to_redirect: [],
          }
        }

        // Update if it's changed and push the prior onto the list of
        // slugs to redicts
        else if (
          ksuidRedirects.ksuid_redirects[lowercaseId].current_slug !== urlSlug
        ) {
          if (
            !ksuidRedirects.ksuid_redirects[
              lowercaseId
            ].slugs_to_redirect.includes(urlSlug)
          ) {
            ksuidRedirects.ksuid_redirects[lowercaseId].slugs_to_redirect.push(
              ksuidRedirects.ksuid_redirects[lowercaseId].current_slug
            )
            ksuidRedirects.ksuid_redirects[lowercaseId].current_slug = urlSlug
          }
        }
      }
    }
  }
})

//////////////////////////////////////////////////////////
// Make sure redirects aren't pointing to themselves.

for (const urlKey in ksuidRedirects.ksuid_redirects) {
  const currentSlug = ksuidRedirects.ksuid_redirects[urlKey].current_slug
  const indexOfInfiniteRedirect =
    ksuidRedirects.ksuid_redirects[urlKey].slugs_to_redirect.indexOf(
      currentSlug
    )
  if (indexOfInfiniteRedirect > -1) {
    console.log(`- Killing Infinite Redirect: ${currentSlug}`)
    ksuidRedirects.ksuid_redirects[urlKey].slugs_to_redirect.splice(
      indexOfInfiniteRedirect,
      1
    )
  }
}

//////////////////////////////////////////////////////////
// write out the data storage file

fs.writeFileSync(
  config[currentEnv].ksuidRedirectsOutputFile,
  JSON.stringify(ksuidRedirects, null, 2)
)

//////////////////////////////////////////////////////////
// Generate the redirects file itself.

const redirectsOutputArray = []

for (const ksuid in ksuidRedirects.ksuid_redirects) {
  const genericRedirect = `/posts/${ksuid}    ${ksuidRedirects.ksuid_redirects[ksuid].current_slug}    301`
  redirectsOutputArray.push(genericRedirect)

  ksuidRedirects.ksuid_redirects[ksuid].slugs_to_redirect.forEach((slug) => {
    const redirectLine = `${slug}    ${ksuidRedirects.ksuid_redirects[ksuid].current_slug}    301`
    redirectsOutputArray.push(redirectLine)
  })
}

fs.writeFileSync(
  config[currentEnv].redirectsFile,
  redirectsOutputArray.join('\n')
)

///////////////////////////////////////////////////////////
// Sanity check numbers

console.log(
  `Total: ${fileCounts.total} - IDs: ${fileCounts.containsId} - Published: ${fileCounts.confirmedStatus}`
)

////////////////////////////////////////////////////////////
// Make the images file.

const image_files = fs.readdirSync(
  '/Users/alan/workshop/alanwsmith.com/_images'
)

fs.writeFileSync(
  config[currentEnv].imageFile,
  "import Image from 'next/image'\n\n"
)

for (let image_file of image_files) {
  const fileParts = image_file.split('.')
  if (image_file === '.DS_Store') {
    continue
  }
  fs.appendFileSync(
    config[currentEnv].imageFile,
    `import ${fileParts[0]} from '../_images/${image_file}'\n`
  )
}

fs.appendFileSync(config[currentEnv].imageFile, `\nconst imgMap = {\n`)

for (let image_file of image_files) {
  const fileParts = image_file.split('.')
  if (image_file === '.DS_Store') {
    continue
  }
  fs.appendFileSync(
    config[currentEnv].imageFile,
    `  ${fileParts[0]}: ${fileParts[0]},\n`
  )
}

fs.appendFileSync(
  config[currentEnv].imageFile,
  `}\n\nexport default function Img({ src, alt = 'image alt text unavailable' }) { \n const fileParts = src.split('.') \n return <Image src={imgMap[fileParts[0]]} alt={alt} /> \n}`
)

/////////////////////////////////////////////////////////////
// Copy down ThePodOfAlan RSS feed and scrub it

console.log('Getting podcast RSS feed...')

axios
  .get('https://feeds.simplecast.com/xLr7FvDj')
  .then((response) => {
    console.log('Got feed...')
    let feedXML = response.data
    feedXML = feedXML.replace(
      '<atom:link href="https://simplecast.superfeedr.com/" rel="hub" xmlns="http://www.w3.org/2005/Atom"/>',
      ''
    )
    feedXML = feedXML.replace(
      '<generator>https://simplecast.com</generator>',
      ''
    )
    feedXML = feedXML.replace('<googleplay:block>yes</googleplay:block>', '')
    feedXML = feedXML.replace('<itunes:block>yes</itunes:block>', '')
    feedXML = feedXML.replace(
      '<meta content="noindex" name="robots" xmlns:atom="http://www.w3.org/2005/Atom"/>',
      ''
    )
    feedXML = feedXML
      .split(`podcast@alanwsmith.com (Alan W. Smith)`)
      .join('Alan W. Smith')

    // Output the main file
    mainOutput = feedXML
      .split('"https://feeds.simplecast.com/xLr7FvDj"')
      .join('"https://www.alanwsmith.com/thepodofalan.xml"')
    console.log('Writing out main scrubbed podcast feed...')
    fs.writeFileSync(config[currentEnv].podcastRssOutputPath, mainOutput)

    // Output the google version of the file
    googleOutput = feedXML
      .split('"https://feeds.simplecast.com/xLr7FvDj"')
      .join('"https://www.alanwsmith.com/thepodofalan-google.xml"')
    console.log('Writing out google scrubbed podcast feed...')
    fs.writeFileSync(
      config[currentEnv].podcastRssOutputPathGoogle,
      googleOutput
    )
  })
  .catch((error) => {
    console.error(error)
  })
