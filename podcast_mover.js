#!/usr/bin/env node

const axios = require('axios')
const fs = require('fs')

// const originalFeedUrl = new RegExp('https://feeds.simplecast.com/xLr7FvDj', 'g')

axios
  .get('https://feeds.simplecast.com/xLr7FvDj')
  .then((response) => {
    const originalText = response.data
    const newText1 = originalText.replace(
      '<atom:link href="https://simplecast.superfeedr.com/" rel="hub" xmlns="http://www.w3.org/2005/Atom"/>',
      ''
    )
    const newText2 = newText1.replace(
      '<generator>https://simplecast.com</generator>',
      ''
    )
    const split1 = newText2.split('https://feeds.simplecast.com/xLr7FvDj')
    const join1 = split1.join('https://www.alanwsmith.com/thepodofalan.xml')
    const split2 = join1.split(`podcast@alanwsmith.com (Alan W. Smith)`)
    const join2 = split2.join('Alan W. Smith')

    // console.log(split1)
    fs.writeFileSync('output.xml', join2)
    // console.log(response)
  })
  .catch((error) => {
    console.error(error)
  })
