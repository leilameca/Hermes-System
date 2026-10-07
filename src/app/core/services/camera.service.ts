import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class CameraService {
  async capture(): Promise<string> {
    if (!Capacitor.isNativePlatform()) {
      const { defineCustomElements } = await import('@ionic/pwa-elements/loader');
      defineCustomElements(window);
    }
    const photo = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.DataUrl,
      quality: 70,
      width: 1280,
      height: 1280,
      correctOrientation: true,
      saveToGallery: false,
      promptLabelHeader: 'Evidencia del vehículo',
    });
    if (!photo.dataUrl) throw new Error('La cámara no devolvió una fotografía.');
    if (photo.dataUrl.length > 7 * 1024 * 1024) throw new Error('La foto es demasiado grande. Toma otra fotografía.');
    return photo.dataUrl;
  }

  errorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel/i.test(message)) return 'Captura cancelada. Puedes volver a intentarlo.';
    if (/permission|denied|notallowed/i.test(message)) return 'Permiso de cámara denegado. Actívalo en los ajustes del dispositivo o navegador.';
    if (/notfound|device/i.test(message)) return 'No se encontró una cámara disponible en este dispositivo.';
    return 'No fue posible tomar la fotografía. Revisa la cámara e inténtalo de nuevo.';
  }
}
