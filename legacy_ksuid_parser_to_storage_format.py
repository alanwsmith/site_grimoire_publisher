#!/usr/bin/env python3

import json 

with open('/Users/alans/workshop/alanwsmith.com/_data/_ksuid_redirects_original.json', 'w') as _output:
    with open('legacy-slug-to-ksuid-map.json') as _input:
        json_data = json.load(_input)
        output_structure = {
            'ksuid_redirects': {}
        }
        for key in json_data.keys():
            output_structure['ksuid_redirects'][key] = {
                "current_slug": json_data[key], 
                "slugs_to_redirect": []
            }

        json.dump(output_structure, _output, sort_keys=True, indent=2, default=str)





