// Apre un PDF col motore di macOS (Quartz) e lo riscrive come PNG o come PDF.
//
//   swift scripts/opera/pdf_quartz.swift ingresso.pdf uscita.png 3000
//   swift scripts/opera/pdf_quartz.swift ingresso.pdf uscita.pdf "Titolo del documento"
//
// Perché non pdftoppm: le planimetrie dello Studio usano Verdana SENZA incorporarlo, e poppler al posto
// di VERANDA, PORTICO, AREA VERDE stampa file di quadratini barrati. Quartz trova il Verdana di macOS
// e, riscrivendo il PDF, lo incorpora: così il file si legge bene anche su chi Verdana non ce l'ha.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let a = CommandLine.arguments
guard a.count == 4, let doc = CGPDFDocument(URL(fileURLWithPath: a[1]) as CFURL), let pagina = doc.page(at: 1) else {
    fputs("uso: pdf_quartz.swift ingresso.pdf uscita.(png|pdf) (larghezza|titolo)\n", stderr)
    exit(1)
}
let uscita = URL(fileURLWithPath: a[2])
var box = pagina.getBoxRect(.mediaBox)

if uscita.pathExtension == "pdf" {
    let info = [kCGPDFContextTitle as String: a[3]] as CFDictionary
    guard let ctx = CGContext(uscita as CFURL, mediaBox: &box, info) else { exit(1) }
    ctx.beginPDFPage(nil)
    ctx.drawPDFPage(pagina)
    ctx.endPDFPage()
    ctx.closePDF()
} else {
    let s = Double(a[3])! / Double(box.width)
    let W = Int(Double(box.width) * s), H = Int(Double(box.height) * s)
    let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
    ctx.scaleBy(x: s, y: s)
    ctx.drawPDFPage(pagina)
    let d = CGImageDestinationCreateWithURL(uscita as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, ctx.makeImage()!, nil)
    CGImageDestinationFinalize(d)
}
