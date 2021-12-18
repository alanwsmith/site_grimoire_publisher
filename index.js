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
    podcastRssOutputPath: 'test_data/thepodofalan.xml',
  },
  prod: {
    inputDir: '/Users/alans/Dropbox/grimoire',
    outputDir: '/Users/alans/workshop/alanwsmith.com/_posts',

    legacySlugMapFile: 'legacy-slug-to-ksuid-map.json',
    legacyRedirectMiddlewareFile:
      '/Users/alans/workshop/alanwsmith.com/pages/_middleware.js',
    // legacySlugRedirectOutputFile:
    //'/Users/alans/workshop/alanwsmith.com/data/legacy-url-slug-to-ksuid-redirects.json',

    activeRedictMiddlewereFile:
      '/Users/alans/workshop/alanwsmith.com/pages/posts/_middleware.js',
    redirectsFile: '/Users/alans/workshop/alanwsmith.com/_data/_redirects',
    ksuidRedirectsInputFile:
      '/Users/alans/workshop/alanwsmith.com/_data/_ksuid_redirects.json',
    ksuidRedirectsOutputFile:
      '/Users/alans/workshop/alanwsmith.com/_data/_ksuid_redirects.json',
    imageFile: '/Users/alans/workshop/alanwsmith.com/components/Img.js',
    podcastRssOutputPath:
      '/Users/alans/workshop/alanwsmith.com/public/thepodofalan.xml',
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
          ksuidRedirects.ksuid_redirects[lowercaseId].slugs_to_redirect.push(
            ksuidRedirects.ksuid_redirects[lowercaseId].current_slug
          )
          ksuidRedirects.ksuid_redirects[lowercaseId].current_slug = urlSlug
        }
      }
    }
  }
})

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
  '/Users/alans/workshop/alanwsmith.com/_images'
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
  `}\n\nexport default function Img({ src, alt = 'image alt text unavailable' }) { \n return <Image src={imgMap[src]} alt={alt} /> \n}`
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
      .split('"https://feeds.simplecast.com/xLr7FvDj"')
      .join('"https://www.alanwsmith.com/thepodofalan.xml"')
    feedXML = feedXML
      .split(`podcast@alanwsmith.com (Alan W. Smith)`)
      .join('Alan W. Smith')

    console.log('Writing out scrubbed podcast feed...')
    fs.writeFileSync(config[currentEnv].podcastRssOutputPath, feedXML)
  })
  .catch((error) => {
    console.error(error)
  })
