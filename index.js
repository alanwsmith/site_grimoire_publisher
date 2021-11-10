#!/usr/bin/env node

// This is the process that moves files from the
// grimoire to the site along with setting up
// the config files to do the redirects when
// slugs change

const fs = require('fs')
const matter = require('gray-matter')

// const inputDir = 'test_data/input'
// const outputDir = 'test_data/output'
// const ksuidRedirectsInputFile = 'test_data/redirects/input.json'
// const ksuidRedirectsOutputFile = 'test_data/redirects/output.json'

// TODO: Update this so it deletes files before writing into the
// output directory.
// TODO: commit the site to git when the update happens.
//
//
const inputDir =
  '/Users/alans/workshop/site_content_ksuid_migration_data/06_renamed_files'
const outputDir = '/Users/alans/workshop/alanwsmith.com/_posts'
const ksuidRedirectsInputFile =
  '/Users/alans/workshop/alanwsmith.com/data/ksuid-redirects-initial.json'
const ksuidRedirectsOutputFile =
  '/Users/alans/workshop/alanwsmith.com/data/ksuid-redirects.json'

const files = fs.readdirSync(inputDir)
const file_extension = /\.txt$/

const prefixRegex = /^\w+-\s+/g
const slugRegex = /[^\w\s]/g

const ksuidRedirects = JSON.parse(fs.readFileSync(ksuidRedirectsInputFile))
// console.log(ksuidRedirects)

files.forEach((filename) => {
  console.log(`Processing: ${filename}`)
  if (filename.match(file_extension)) {
    const inputPath = `${inputDir}/${filename}`
    const parts = matter.read(inputPath)

    // TODO Figure out what happens if there's no data returned.

    // Only process if there's an id
    if (parts.data.id) {
      console.log(`-- Found ID: ${parts.data.id}`)

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
      // console.log(slug)

      // this is what's used in the referencing
      const postsSlug = `/posts/${slug}`

      // Add the slug into the frontmatter
      // TODO: See if you can remove the slug.
      // I think you should be able to
      // parts.data.slug = slug

      // Create the output path an assembe the file
      const outputPath = `${outputDir}/${slug}.mdx`
      const fileContents = matter.stringify(parts.content, parts.data)
      // console.log(outputPath)

      // only publish things that match the proper status
      if (parts.data.status.match(/^(archive|scratch|draft|published)$/)) {
        // Write the file out
        fs.writeFile(outputPath, fileContents, (err) => {
          if (err) throw err
          // console.log(`Wrote: ${outputPath}`)
        })

        // Add the page to the redirects file if it's new
        if (ksuidRedirects.ksuid_redirects[parts.data.id] === undefined) {
          ksuidRedirects.ksuid_redirects[parts.data.id] = {
            current_slug: slug,
            slugs_to_redirect: [],
          }
        }
        // Update if it's changed and push the prior onto the list of
        // slugs to redicts
        else if (
          ksuidRedirects.ksuid_redirects[parts.data.id].current_slug !==
          postsSlug
        ) {
          ksuidRedirects.ksuid_redirects[parts.data.id].slugs_to_redirect.push(
            ksuidRedirects.ksuid_redirects[parts.data.id].current_slug
          )
          ksuidRedirects.ksuid_redirects[parts.data.id].current_slug = postsSlug
        }

        // Write out the redirects files
        fs.writeFileSync(
          ksuidRedirectsOutputFile,
          JSON.stringify(ksuidRedirects, null, 2)
        )

        // // Add the data to the rewrites
        // urlRewrites.push({
        //   source: `/posts/${slug}`,
        //   destination: `/posts/${parts.data.id}`,
        // })
      }
    }
  }
})

// console.log(urlRewrites)
// console.log(JSON.stringify(ksuidRedirects))
