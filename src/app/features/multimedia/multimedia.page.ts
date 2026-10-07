import { Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonRange, IonList, IonItem, IonLabel, IonSpinner, IonRefresher, IonRefresherContent, RefresherCustomEvent, RangeCustomEvent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-multimedia', standalone: true,
  imports: [IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonRange, IonList, IonItem, IonLabel, IonSpinner, IonRefresher, IonRefresherContent],
  templateUrl: './multimedia.page.html', styleUrl: './multimedia.page.scss',
})
export class MultimediaPage implements OnDestroy {
  @ViewChild('player') private player?: ElementRef<HTMLAudioElement>;
  readonly tracks = [
    { title: 'Ruta urbana', description: 'Pieza instrumental original para la demostración de HERMES.', src: 'assets/audio/ruta-urbana.mp3' },
    { title: 'Viaje tranquilo', description: 'Segunda pieza instrumental local, disponible sin conexión después de instalar la app.', src: 'assets/audio/viaje-tranquilo.mp3' },
  ];
  readonly vehicles = [
    { title: 'Toyota Corolla', src: 'assets/images/vehicles/corolla.jpg', detail: 'Sedán económico ideal para ciudad.' },
    { title: 'Hyundai Tucson', src: 'assets/images/vehicles/tucson.jpg', detail: 'SUV espaciosa y moderna.' },
    { title: 'Kia Sportage', src: 'assets/images/vehicles/sportage.jpg', detail: 'Comodidad para tus próximos recorridos.' },
  ];
  readonly selected = signal(0);
  readonly playing = signal(false);
  readonly loading = signal(false);
  readonly current = signal(0);
  readonly duration = signal(0);
  readonly error = signal('');
  readonly volume = signal(0.7);
  private playRequest = 0;

  async playPause() {
    const audio = this.player?.nativeElement;
    if (!audio) return;
    if (!audio.paused) { this.pause(); return; }
    const request = ++this.playRequest;
    this.error.set(''); this.loading.set(true);
    try { await audio.play(); if (request !== this.playRequest) audio.pause(); }
    catch { if (request === this.playRequest) { this.loading.set(false); this.error.set('No fue posible reproducir el audio. Inténtalo de nuevo.'); } }
  }
  pause() { this.playRequest++; this.player?.nativeElement.pause(); this.playing.set(false); this.loading.set(false); }
  stop() { this.pause(); if (this.player) this.player.nativeElement.currentTime = 0; this.current.set(0); }
  selectTrack(index: number) {
    if (index < 0 || index >= this.tracks.length) return;
    this.stop(); this.selected.set(index); this.duration.set(0); this.error.set('');
    const audio = this.player?.nativeElement;
    if (audio) { audio.src = this.tracks[index].src; audio.load(); }
  }
  next() { this.selectTrack((this.selected() + 1) % this.tracks.length); }
  previous() { this.selectTrack((this.selected() + this.tracks.length - 1) % this.tracks.length); }
  metadata() { const audio = this.player?.nativeElement; this.duration.set(Number.isFinite(audio?.duration) ? audio!.duration : 0); this.loading.set(false); }
  timeUpdate() { this.current.set(this.player?.nativeElement.currentTime ?? 0); }
  seek(event: RangeCustomEvent) { const value = event.detail.value; if (typeof value === 'number' && this.player && this.duration() > 0) this.player.nativeElement.currentTime = Math.max(0, Math.min(this.duration(), value)); }
  setVolume(event: RangeCustomEvent) { const value = event.detail.value; if (typeof value === 'number') { this.volume.set(value); if (this.player) this.player.nativeElement.volume = value; } }
  started() { this.playing.set(true); this.loading.set(false); }
  ended() { this.playing.set(false); this.loading.set(false); }
  failed() { this.loading.set(false); this.playing.set(false); this.error.set('No se pudo cargar este archivo de audio. Selecciona otra pista o vuelve a intentarlo.'); }
  async refresh(event: RefresherCustomEvent) { this.selectTrack(this.selected()); await event.target.complete(); }
  format(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; }
  ionViewWillLeave() { this.pause(); }
  ngOnDestroy() { this.stop(); }
}
