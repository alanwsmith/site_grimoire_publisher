#!/usr/bin/env node

// This is the process that moves files
// from the grimoire to the site along
// with setting up the config files to
// do the redirects and rewrites for
// the urls.

const fs = require('fs')
const matter = require('gray-matter')

const inputDir = 'test_data/input'
const outputDir = 'test_data/output'

const files = fs.readdirSync(inputDir)
const file_extension = /\.txt$/

// TODO: don't copy 'unpublised' status
// TODO: in the migration scripts, switch
//        slug: /tbd to status: unpublished

const prefixRegex = /^\w+-\s+/g
const slugRegex = /[^\w\s]/g

const urlRewrites = []

files.forEach((filename) => {
  if (filename.match(file_extension)) {
    const inputPath = `${inputDir}/${filename}`
    const parts = matter.read(inputPath)
    // Only process if there's an id
    if (parts.data.id) {
      console.log(parts.data.id)

      // Update the title frontmatter if one
      // doesn't already exist (which it shouldn't
      // unless you're doing an override)
      if (!parts.data.title) {
        parts.data.title = filename
          .replaceAll(prefixRegex, '')
          .replaceAll('.txt', '')
      }

      // Make the slug based off the title frontmatter
      // that has just been updated or has an override
      // in it.
      const slug =
        parts.data.id +
        `--` +
        parts.data.title
          .replaceAll(prefixRegex, '')
          .replaceAll(slugRegex, '')
          .replaceAll(' ', '-')
          .toLowerCase()
      console.log(slug)

      // Add the slug into the frontmatter
      parts.data.slug = slug

      // Create the output path an assembe the file
      const outputPath = `${outputDir}/${parts.data.id}.mdx`
      const fileContents = matter.stringify(parts.content, parts.data)
      console.log(outputPath)

      // only publish things that match the proper status
      if (parts.data.status.match(/archive|scratch|draft|published/)) {
        // Write the file out
        fs.writeFile(outputPath, fileContents, (err) => {
          if (err) throw err
          console.log(`Wrote: ${outputPath}`)
        })

        // Add the data to the rewrites
        urlRewrites.push({
          source: `/posts/${slug}`,
          destination: `/posts/${parts.data.id}`,
        })
      }
    }
  }
})

console.log(urlRewrites)
