const tr = {
  locale: { label: "Dil" },
  form: {
    urlLabel: "Video linki",
    urlPlaceholder: "https://…",
    analyze: "Analiz et",
    analyzing: "Analiz ediliyor…",
  },
  options: {
    kindLegend: "Tür",
    video: "Video",
    audio: "Ses",
    resolutionLegend: "Çözünürlük",
    maxResolutionLegend: "En yüksek çözünürlük",
    containerLegend: "Video formatı",
    audioFormatLegend: "Ses formatı",
    bitrateLegend: "Kalite",
    download: "İndir",
    starting: "Başlatılıyor…",
  },
  playlist: {
    videoCount: "{count} video",
    excluded: "{count} video kullanılamıyor, listeye alınmadı.",
  },
  list: {
    heading: "İndirmeler",
    empty: "Henüz indirme yok.",
    cancel: "İptal et",
    eta: "{time} kaldı",
    savedTo: "Kaydedildi",
    playlistSummary: "{downloaded} indi, {skipped} atlandı",
    skippedHeading: "Atlanan videolar ({count})",
    phase: {
      video: "video iniyor",
      audio: "ses iniyor",
      processing: "işleniyor",
    },
    status: { done: "Bitti", error: "Hata", cancelled: "İptal edildi" },
  },
  errors: {
    invalidUrl: "Geçerli bir http(s) linki gir.",
    invalidRequest: "Geçersiz indirme seçimi.",
    binaryMissing: "yt-dlp kurulu değil ya da PATH üzerinde değil.",
    ytdlpFailed: "yt-dlp başarısız oldu",
    notFound: "İndirme bulunamadı.",
    liveNotSupported: "Canlı yayınlar indirilemez.",
    emptyPlaylist: "Bu playlist'te indirilebilir video yok.",
    playlistTooLong: "En fazla 300 videoluk playlist'ler indirilebilir.",
    unexpected: "Beklenmeyen bir hata oluştu.",
  },
};

export type Messages = typeof tr;
export default tr;
