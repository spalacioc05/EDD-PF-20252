import sys
from pdfminer.high_level import extract_text

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('', end='')
        sys.exit(0)
    pdf_path = sys.argv[1]
    try:
        text = extract_text(pdf_path)
        if text is None:
            text = ''
        print(text)
    except Exception as e:
        # Return empty text on failure
        print('', end='')
        sys.exit(0)
