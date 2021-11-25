#!/usr/bin/env python3

import json
import re

with open('/Users/alans/workshop/alanwsmith.com/_data/_ksuid_redirects_starting.json', 'w') as _output:
    with open('/Users/alans/workshop/alanwsmith.com/_data/_redirects_original') as _input:
        output_structure = {
            'ksuid_redirects': {}
        }
        for line in _input.readlines():
            parts = re.split('\s+', line)
            slug_parts = parts[1].split('/')
            key_parts = slug_parts[2].split('--')
            print(key_parts[0])

            output_structure['ksuid_redirects'][key_parts[0]] = {
                "current_slug": parts[0],
                "slugs_to_redirect": []
            }


        json.dump(output_structure, _output, sort_keys=True, indent=2, default=str)

