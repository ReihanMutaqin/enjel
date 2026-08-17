Add-Type -AssemblyName System.Drawing

function Rotate-Exif {
    param([System.Drawing.Image]$img)
    if ($img.PropertyIdList -contains 0x0112) {
        $prop = $img.GetPropertyItem(0x0112)
        $val = [BitConverter]::ToUInt16($prop.Value, 0)
        switch ($val) {
            2 { $img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
            3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
            4 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
            5 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
            6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
            7 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
            8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
        }
        $img.RemovePropertyItem(0x0112)
    }
}

function Resize-ImageFile {
    param(
        [string]$sourcePath,
        [string]$targetPath,
        [int]$maxDim = 1200,
        [long]$quality = 90
    )

    $fullSource = (Resolve-Path $sourcePath).Path
    $img = [System.Drawing.Image]::FromFile($fullSource)
    Rotate-Exif $img

    $ratio = [Math]::Min($maxDim / $img.Width, $maxDim / $img.Height)
    if ($ratio -gt 1) { $ratio = 1 }
    $newW = [int]($img.Width * $ratio)
    $newH = [int]($img.Height * $ratio)
    
    $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($img, 0, 0, $newW, $newH)
    
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
    
    $bmp.Save($targetPath, $codec, $encoderParams)
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
    Write-Host "Processed $sourcePath -> $targetPath ($newW x $newH)"
}

Resize-ImageFile "habib-gabbyy/FOTO1.jpeg" "habib-gabbyy/foto_wanita.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO2.jpeg" "habib-gabbyy/foto_pria.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO1.jpeg" "habib-gabbyy/foto1.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO2.jpeg" "habib-gabbyy/foto2.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO3.jpeg" "habib-gabbyy/foto3.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO4.jpeg" "habib-gabbyy/foto4.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO5.jpeg" "habib-gabbyy/foto5.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO6.jpeg" "habib-gabbyy/foto6.jpg" 1200 90
Resize-ImageFile "habib-gabbyy/FOTO4.jpeg" "habib-gabbyy/fotobawah.jpg" 1400 90
