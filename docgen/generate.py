#!/usr/bin/env python3
"""Generate bilingual DE/CN contract PDF from JSON data."""
import json, sys, os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), 'templates')

def generate(data_json: str, output_path: str):
    data = json.loads(data_json)
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template('contract_de.html')
    html = template.render(**data)
    HTML(string=html).write_pdf(output_path)
    return output_path

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python generate.py <data.json> <output.pdf>')
        sys.exit(1)
    result = generate(sys.argv[1], sys.argv[2])
    print(result)
