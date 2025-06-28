"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Share, Mail, MessageCircle, FileText } from "lucide-react"
import Image from "next/image"

const TRUCK_MODELS = [
  { id: "L5000", name: "SHACMAN L5000", price: 750000, pdf: "SHACMAN-L5000-4X2.pdf" },
  { id: "X5000", name: "SHACMAN X5000", price: 1250000, pdf: "Shacman X5000 Ficha Técnica.pdf" },
  { id: "F3000", name: "SHACMAN F3000", price: 980000, pdf: "SHACMAN-F3000.pdf" },
  { id: "H3000", name: "SHACMAN H3000", price: 1150000, pdf: "SHACMAN-H3000.pdf" },
  { id: "M3000", name: "SHACMAN M3000", price: 1070000, pdf: "SHACMAN-M3000.pdf" },
]

interface FormData {
  vendedor: string
  cliente: string
  empresa: string
  modelo: string
  transmision: string
  cantidad: number
  descuento: number
  notas: string
}

export default function CotizadorShacman() {
  const [formData, setFormData] = useState<FormData>({
    vendedor: "",
    cliente: "",
    empresa: "",
    modelo: "",
    transmision: "",
    cantidad: 1,
    descuento: 0,
    notas: "",
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNumberChange = (field: keyof FormData, value: string) => {
    const numValue = Number.parseFloat(value) || 0
    setFormData((prev) => ({ ...prev, [field]: numValue }))
  }

  const selectedTruck = TRUCK_MODELS.find((truck) => truck.id === formData.modelo)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(price)
  }

  const calculateTotals = () => {
    if (!selectedTruck) return { subtotal: 0, descuentoAmount: 0, total: 0 }

    const subtotal = selectedTruck.price * formData.cantidad
    const descuentoAmount = (subtotal * formData.descuento) / 100
    const total = subtotal - descuentoAmount

    return { subtotal, descuentoAmount, total }
  }

  const { subtotal, descuentoAmount, total } = calculateTotals()

  const generatePDF = async () => {
    if (!formData.modelo || !formData.vendedor || !formData.cliente) {
      alert("Por favor completa los campos obligatorios")
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)

        // Abrir en nueva pestaña
        window.open(url, "_blank")
      } else {
        alert("Error al generar el PDF")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error al generar el PDF")
    } finally {
      setIsGenerating(false)
    }
  }

  const shareWhatsApp = () => {
    if (!pdfUrl) {
      alert("Primero genera la cotización")
      return
    }

    const message = `Cotización SHACMAN - ${selectedTruck?.name}\nCliente: ${formData.cliente}\nCantidad: ${formData.cantidad} unidad${formData.cantidad !== 1 ? "es" : ""}\nTotal: ${formatPrice(total)}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const shareEmail = () => {
    if (!pdfUrl) {
      alert("Primero genera la cotización")
      return
    }

    const subject = `Cotización SHACMAN - ${selectedTruck?.name}`
    const body = `Estimado/a ${formData.cliente},\n\nAdjunto encontrarás la cotización para ${formData.cantidad} unidad${formData.cantidad !== 1 ? "es" : ""} del ${selectedTruck?.name}.\n\nTotal: ${formatPrice(total)}\n\nSaludos,\n${formData.vendedor}`
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <Image src="/logo-shacman.png" alt="SHACMAN Logo" width={200} height={80} className="mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">COTIZADOR SHACMAN MÉXICO</h1>
          <p className="text-gray-600">Genera cotizaciones profesionales para camiones SHACMAN</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Datos de la Cotización
              </CardTitle>
              <CardDescription>Completa la información para generar la cotización</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendedor">Nombre del Vendedor *</Label>
                  <Input
                    id="vendedor"
                    value={formData.vendedor}
                    onChange={(e) => handleInputChange("vendedor", e.target.value)}
                    placeholder="Ingresa tu nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cliente">Nombre del Cliente *</Label>
                  <Input
                    id="cliente"
                    value={formData.cliente}
                    onChange={(e) => handleInputChange("cliente", e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  value={formData.empresa}
                  onChange={(e) => handleInputChange("empresa", e.target.value)}
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo del Camión *</Label>
                <Select value={formData.modelo} onValueChange={(value) => handleInputChange("modelo", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRUCK_MODELS.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        {truck.name} - {formatPrice(truck.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transmision">Transmisión</Label>
                <Select value={formData.transmision} onValueChange={(value) => handleInputChange("transmision", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona transmisión" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatica">Automática</SelectItem>
                    <SelectItem value="estandar">Estándar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cantidad">Cantidad de Unidades</Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="1"
                    value={formData.cantidad}
                    onChange={(e) => handleNumberChange("cantidad", e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descuento">Descuento (%)</Label>
                  <Input
                    id="descuento"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.descuento}
                    onChange={(e) => handleNumberChange("descuento", e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Notas Adicionales</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => handleInputChange("notas", e.target.value)}
                  placeholder="Información adicional, condiciones especiales, etc."
                  rows={4}
                />
              </div>

              <Button onClick={generatePDF} disabled={isGenerating} className="w-full" size="lg">
                {isGenerating ? "Generando..." : "Generar Cotización"}
              </Button>
            </CardContent>
          </Card>

          {/* Resumen y Acciones */}
          <div className="space-y-6">
            {/* Resumen */}
            {selectedTruck && (
              <Card>
                <CardHeader>
                  <CardTitle>Resumen de la Cotización</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Modelo:</span>
                    <span>{selectedTruck.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Precio Unitario:</span>
                    <span>{formatPrice(selectedTruck.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Cantidad:</span>
                    <span>
                      {formData.cantidad} unidad{formData.cantidad !== 1 ? "es" : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Subtotal:</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {formData.descuento > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="font-medium">Descuento ({formData.descuento}%):</span>
                      <span>-{formatPrice(descuentoAmount)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-lg font-bold text-green-600">{formatPrice(total)}</span>
                  </div>
                  {formData.transmision && (
                    <div className="flex justify-between">
                      <span className="font-medium">Transmisión:</span>
                      <span className="capitalize">{formData.transmision}</span>
                    </div>
                  )}
                  {formData.cliente && (
                    <div className="flex justify-between">
                      <span className="font-medium">Cliente:</span>
                      <span>{formData.cliente}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Acciones de Compartir */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share className="w-5 h-5" />
                  Compartir Cotización
                </CardTitle>
                <CardDescription>
                  {pdfUrl ? "Comparte la cotización generada" : "Genera primero la cotización para compartir"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={shareWhatsApp} disabled={!pdfUrl} variant="outline" className="w-full bg-transparent">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Compartir por WhatsApp
                </Button>
                <Button onClick={shareEmail} disabled={!pdfUrl} variant="outline" className="w-full bg-transparent">
                  <Mail className="w-4 h-4 mr-2" />
                  Compartir por Email
                </Button>
              </CardContent>
            </Card>

            {/* Información */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">📋 Información:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• La cotización incluye las 2 páginas de ficha técnica</li>
                    <li>• Se genera una página adicional con los datos del cliente</li>
                    <li>• El PDF se abre automáticamente en una nueva pestaña</li>
                    <li>• Los campos marcados con * son obligatorios</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
