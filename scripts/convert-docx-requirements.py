"""Convert supplied DOCX requirement documents to readable Markdown."""

from __future__ import annotations

import sys
from pathlib import Path

from docx import Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph


def clean(value: str) -> str:
    return value.replace("|", "\\|").strip()


def paragraph_markdown(paragraph: Paragraph) -> str:
    text = paragraph.text.strip()
    if not text:
        return ""
    style = paragraph.style.name
    prefix = {"Title": "# ", "Heading 1": "## ", "Heading 2": "### ", "Heading 3": "#### "}.get(style)
    if prefix:
        return prefix + text
    if style.startswith("List Bullet"):
        return "- " + text
    if style.startswith("List Number"):
        return "1. " + text
    return text


def table_markdown(table: Table) -> list[str]:
    rows = [[clean(cell.text.replace("\n", "<br>")) for cell in row.cells] for row in table.rows]
    if not rows:
        return []
    width = len(rows[0])
    lines = ["| " + " | ".join(rows[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
    lines.extend("| " + " | ".join(row) + " |" for row in rows[1:])
    return lines


def convert(source: Path, destination: Path) -> None:
    document = Document(source)
    output: list[str] = []
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            value = paragraph_markdown(Paragraph(child, document))
            if value:
                output.extend([value, ""])
        elif isinstance(child, CT_Tbl):
            output.extend(table_markdown(Table(child, document)))
            output.append("")
    destination.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")


if __name__ == "__main__":
    convert(Path(sys.argv[1]), Path(sys.argv[2]))
