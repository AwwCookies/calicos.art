Vue.createApp({
  data() {
    return {
      images: [],
      search: "",
      activeTag: "",
      loadingImages: new Set(),
      imageIndexes: {},
      dominantColors: {},
      tiltDegrees: {},
      lightboxImage: null, // Track the currently selected image for the lightbox
    };
  },
  computed: {
    filteredImages() {
      return this.images.filter((img) => {
        const matchesSearch = (img.description || "")
          .toLowerCase()
          .includes(this.search.toLowerCase());
        const tags = Array.isArray(img.tags) ? img.tags : [];
        const matchesTag = this.activeTag
          ? tags.includes(this.activeTag)
          : true;
        return matchesSearch && matchesTag;
      });
    },
    uniqueTags() {
      const tagSet = new Set();
      this.images.forEach((img) => {
        const tags = Array.isArray(img.tags) ? img.tags : [];
        tags.forEach((t) => tagSet.add(t));
      });
      return [...tagSet];
    },
  },
  methods: {
    formatDate(dateStr) {
      const options = { year: "numeric", month: "long", day: "numeric" };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    },
    getCurrentImage(image) {
      if (Array.isArray(image.urls) && image.urls.length > 0) {
        const idx =
          this.imageIndexes[image.order || image.url || image.description] || 0;
        return image.urls[idx] || image.urls[0];
      }
      return image.url;
    },
    getImageCount(image) {
      return Array.isArray(image.urls) ? image.urls.length : 1;
    },
    getCurrentIndex(image) {
      if (Array.isArray(image.urls)) {
        return (
          (this.imageIndexes[image.order || image.url || image.description] ||
            0) + 1
        );
      }
      return 1;
    },
    prevImage(image) {
      if (!Array.isArray(image.urls)) return;
      const key = image.order || image.url || image.description;
      let idx = this.imageIndexes[key] || 0;
      idx = (idx - 1 + image.urls.length) % image.urls.length;
      this.$set(this.imageIndexes, key, idx);
    },
    nextImage(image) {
      if (!Array.isArray(image.urls)) return;
      const key = image.order || image.url || image.description;
      let idx = this.imageIndexes[key] || 0;
      idx = (idx + 1) % image.urls.length;
      this.$set(this.imageIndexes, key, idx);
    },
    handleImageLoad(url) {
      this.loadingImages.delete(url);
      const img = document.querySelector(`img[src="${url}"]`);
      if (img && window.ColorThief) {
        try {
          const color = new window.ColorThief().getColor(img);
          this.dominantColors[url] = color;
        } catch (e) {}
      }
    },
    handleImageError(url) {
      this.loadingImages.delete(url);
    },
    getCardStyle(image) {
      const key = image.order || image.url || image.description;
      const deg = this.tiltDegrees[key] || 0;
      return {
        transform: `rotate(${deg}deg) scale(1)`,
        transition: "transform 0.3s ease",
      };
    },
    getCatFilter(image) {
      const url = this.getCurrentImage(image);
      const color = this.dominantColors[url] || [128, 128, 128];
      const opp = color.map((c) => 255 - c);
      return `brightness(0) saturate(100%) invert(100%) sepia(100%) hue-rotate(${Math.round(
        (opp[0] - opp[2]) * 1.5
      )}deg) brightness(1.2) saturate(2)`;
    },
    getTagStyle(tag) {
      const pastelColors = [
        "#f5e0dc",
        "#f9e2af",
        "#a6e3a1",
        "#94e2d5",
        "#89b4fa",
        "#cba6f7",
        "#f38ba8",
      ];
      const color =
        pastelColors[Math.abs(this.hashString(tag)) % pastelColors.length];
      const isActive = this.activeTag === tag;

      return {
        backgroundColor: isActive ? `${color}33` : `${color}22`, // Darker when active
        borderColor: color,
        color: color,
      };
    },
    isComicImage(image) {
      return Array.isArray(image.urls) && image.urls.length > 0;
    },
    getRandomImageExtension(image) {
      const imageExtensions = [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "bmp",
        "tiff",
        "tif",
        "svg",
        "heic",
        "heif",
        "apng",
        "tga",
        "ico",
        "psd",
      ];
      const comicExtensions = [
        "mp4",
        "webm",
        "mov",
        "avi",
        "mkv",
        "flv",
        "wmv",
        "m4v",
        "3gp",
        "mpeg",
        "mpg",
        "gif",
      ];
      const extensions = this.isComicImage(image)
        ? comicExtensions
        : imageExtensions;
      const hash = this.hashString(image.title || image.description || "image");
      return extensions[Math.abs(hash) % extensions.length];
    },
    getTitleWithExtension(image) {
      let title = image.title || image.description || "image";
      title = title
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .replace(/\s+/g, "_")
        .toLowerCase();
      const ext = this.getRandomImageExtension(image);
      return `${title}.${ext}`;
    },
    hashString(str) {
      // Simple hash function to generate consistent values for the same string
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return hash;
    },
    openLightbox(image) {
      this.lightboxImage = image;
    },
    closeLightbox() {
      this.lightboxImage = null;
    },
  },
  mounted() {
    fetch("data.json")
      .then((res) => res.json())
      .then((data) => {
        this.images = data.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        const urls = [];
        this.images.forEach((img) => {
          const key = img.order || img.url || img.description;
          const tilt = (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 3); // ±2–6°
          this.tiltDegrees[key] = tilt.toFixed(2);

          if (Array.isArray(img.urls)) {
            urls.push(...img.urls);
          } else if (img.url) {
            urls.push(img.url);
          }
        });

        this.loadingImages = new Set(urls);
        this.$forceUpdate();
      })
      .catch((err) => console.error("Error loading data.json:", err));
  },
}).mount("#app");
