import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { readFile } from "fs/promises"
import { join } from "path"

const TRUCK_MODELS = [
  { id: "L5000", name: "SHACMAN L5000", price: 750000, pdf: "SHACMAN-L5000-4X2.pdf" },
  { id: "X5000", name: "SHACMAN X5000", price: 1250000, pdf: "Shacman X5000 Ficha Técnica.pdf" },
  { id: "F3000", name: "SHACMAN F3000", price: 980000, pdf: "SHACMAN-F3000.pdf" },
  { id: "H3000", name: "SHACMAN H3000", price: 1150000, pdf: "SHACMAN-H3000.pdf" },
  { id: "M3000", name: "SHACMAN M3000", price: 1070000, pdf: "SHACMAN-M3000.pdf" },
]

export async function POST(request: NextRequest) {
  try {
    const formData = await request.json()
    const selectedTruck = TRUCK_MODELS.find((truck) => truck.id === formData.modelo)

    if (!selectedTruck) {
      return NextResponse.json({ error: "Modelo no encontrado" }, { status: 400 })
    }

    // Crear un nuevo documento PDF final
    const finalPdfDoc = await PDFDocument.create()

    try {
      // Cargar el PDF de la ficha técnica existente
      const pdfPath = join(process.cwd(), "public", "pdfs", selectedTruck.pdf)
      const existingPdfBytes = await readFile(pdfPath)
      const existingPdfDoc = await PDFDocument.load(existingPdfBytes)

      // Copiar las primeras 2 páginas de la ficha técnica
      const pageCount = existingPdfDoc.getPageCount()
      const pagesToCopy = Math.min(2, pageCount) // Máximo 2 páginas

      for (let i = 0; i < pagesToCopy; i++) {
        const [copiedPage] = await finalPdfDoc.copyPages(existingPdfDoc, [i])
        finalPdfDoc.addPage(copiedPage)
      }
    } catch (error) {
      console.error(`Error cargando PDF de ficha técnica: ${selectedTruck.pdf}`, error)
      // Si no se puede cargar el PDF, continuamos sin las páginas de ficha técnica
    }

    // Crear la página de cotización (página 3)
    const quotePage = finalPdfDoc.addPage([595.28, 841.89]) // A4 size
    const { width, height } = quotePage.getSize()

    // Fuentes
    const font = await finalPdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await finalPdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Header
    quotePage.drawText("COTIZACIÓN SHACMAN MÉXICO", {
      x: 50,
      y: height - 80,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    })

    // Línea separadora
    quotePage.drawLine({
      start: { x: 50, y: height - 100 },
      end: { x: width - 50, y: height - 100 },
      thickness: 2,
      color: rgb(0.2, 0.2, 0.2),
    })

    // Información del cliente
    let yPosition = height - 140
    const lineHeight = 25

    quotePage.drawText("INFORMACIÓN DEL CLIENTE", {
      x: 50,
      y: yPosition,
      size: 16,
      font: boldFont,
    })

    yPosition -= 30

    const clientInfo = [
      ["Vendedor:", formData.vendedor],
      ["Cliente:", formData.cliente],
      ["Empresa:", formData.empresa || "N/A"],
    ]

    clientInfo.forEach(([label, value]) => {
      quotePage.drawText(label, {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
      })

      quotePage.drawText(value, {
        x: 150,
        y: yPosition,
        size: 12,
        font: font,
      })

      yPosition -= lineHeight
    })

    // Información del vehículo
    yPosition -= 20

    quotePage.drawText("INFORMACIÓN DEL VEHÍCULO", {
      x: 50,
      y: yPosition,
      size: 16,
      font: boldFont,
    })

    yPosition -= 30

    const formatPrice = (price: number) => {
      return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        minimumFractionDigits: 0,
      }).format(price)
    }

    const subtotal = selectedTruck.price * formData.cantidad
    const descuentoAmount = (subtotal * formData.descuento) / 100
    const total = subtotal - descuentoAmount

    const vehicleInfo = [
      ["Modelo:", selectedTruck.name],
      [
        "Transmisión:",
        formData.transmision ? (formData.transmision === "automatica" ? "Automática" : "Estándar") : "N/A",
      ],
      ["Precio Unitario:", formatPrice(selectedTruck.price)],
      ["Cantidad:", `${formData.cantidad} unidad${formData.cantidad !== 1 ? "es" : ""}`],
      ["Subtotal:", formatPrice(subtotal)],
      ...(formData.descuento > 0
        ? [["Descuento (" + formData.descuento + "%):", "-" + formatPrice(descuentoAmount)]]
        : []),
      ["TOTAL:", formatPrice(total)],
    ]

    vehicleInfo.forEach(([label, value], index) => {
      const isTotal = label === "TOTAL:"
      const isDiscount = label.includes("Descuento")

      quotePage.drawText(label, {
        x: 50,
        y: yPosition,
        size: isTotal ? 14 : 12,
        font: isTotal ? boldFont : boldFont,
        color: isDiscount ? rgb(0.8, 0, 0) : rgb(0, 0, 0),
      })

      quotePage.drawText(value, {
        x: 200,
        y: yPosition,
        size: isTotal ? 14 : 12,
        font: isTotal ? boldFont : font,
        color: isTotal ? rgb(0, 0.6, 0) : isDiscount ? rgb(0.8, 0, 0) : rgb(0, 0, 0),
      })

      yPosition -= isTotal ? 30 : lineHeight
    })

    // Notas
    if (formData.notas) {
      yPosition -= 20

      quotePage.drawText("NOTAS ADICIONALES", {
        x: 50,
        y: yPosition,
        size: 16,
        font: boldFont,
      })

      yPosition -= 30

      // Dividir las notas en líneas
      const maxWidth = width - 100
      const words = formData.notas.split(" ")
      let currentLine = ""

      words.forEach((word) => {
        const testLine = currentLine + (currentLine ? " " : "") + word
        const textWidth = font.widthOfTextAtSize(testLine, 12)

        if (textWidth > maxWidth && currentLine) {
          quotePage.drawText(currentLine, {
            x: 50,
            y: yPosition,
            size: 12,
            font: font,
          })
          yPosition -= lineHeight
          currentLine = word
        } else {
          currentLine = testLine
        }
      })

      if (currentLine) {
        quotePage.drawText(currentLine, {
          x: 50,
          y: yPosition,
          size: 12,
          font: font,
        })
      }
    }

    // Footer
    const currentDate = new Date().toLocaleDateString("es-MX")
    quotePage.drawText(`Fecha de cotización: ${currentDate}`, {
      x: 50,
      y: 50,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Generar el PDF final
    const pdfBytes = await finalPdfDoc.save()

    // Crear nombre del archivo: "Cotización Shacman - MODELO - CLIENTE - Fecha"
    // Función para limpiar caracteres especiales
    const cleanString = (str: string) => {
      return str
        .normalize("NFD") // Descomponer caracteres acentuados
        .replace(/[\u0300-\u036f]/g, "") // Remover acentos
        .replace(/[^a-zA-Z0-9\s-]/g, "") // Solo letras, números, espacios y guiones
        .replace(/\s+/g, " ") // Múltiples espacios a uno solo
        .trim()
    }

    // Crear nombre del archivo sin caracteres especiales
    const cleanClientName = cleanString(formData.cliente)
    const cleanModelName = selectedTruck.name.replace("SHACMAN ", "")
    const dateForFilename = new Date().toLocaleDateString("es-MX").replace(/\//g, "-")
    const filename = `Cotizacion Shacman - ${cleanModelName} - ${cleanClientName} - ${dateForFilename}.pdf`

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 })
  }
}
