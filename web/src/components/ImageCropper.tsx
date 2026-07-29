import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/cropImage'
import { Button } from '@/components/ui/button'

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedFile: File) => void
  onCancel: () => void
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isCropping, setIsCropping] = useState(false)

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleCropImage = async () => {
    try {
      setIsCropping(true)
      const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels)
      if (croppedImageFile) {
        onCropComplete(croppedImageFile)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsCropping(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
        />
      </div>
      <div className="bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t shadow-lg z-10">
        <div className="flex-1 w-full max-w-md">
          <label className="text-sm font-semibold mb-2 block text-slate-700">Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isCropping}>Cancel</Button>
          <Button onClick={handleCropImage} disabled={isCropping}>
            {isCropping ? 'Cropping...' : 'Crop & Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
