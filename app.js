Vue.createApp({
  data() {
    return {
      images: [],
      search: '',
      activeTag: '',
      loadingImages: new Set(),
      // Track current image index for each multi-image card by order (or url as fallback)
      imageIndexes: {}
    };
  },
  computed: {
    filteredImages() {
      return this.images.filter(img => {
        const matchesSearch = (img.title && img.title.toLowerCase().includes(this.search.toLowerCase())) || img.description.toLowerCase().includes(this.search.toLowerCase());
        // Use tags array
        let tags = Array.isArray(img.tags) ? img.tags : [];
        const matchesTag = this.activeTag ? tags.includes(this.activeTag) : true;
        return matchesSearch && matchesTag;
      });
    },
    uniqueTags() {
      // Collect all tags from all images, flatten, dedupe
      const tagSet = new Set();
      this.images.forEach(img => {
        let tags = Array.isArray(img.tags) ? img.tags : [];
        tags.forEach(t => tagSet.add(t));
      });
      return [...tagSet];
    }
  },
  methods: {
    formatDate(dateStr) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    },
    handleImageLoad(url) {
      const newSet = new Set(this.loadingImages);
      newSet.delete(url);
      this.loadingImages = newSet;
    },
    handleImageError(url) {
      const newSet = new Set(this.loadingImages);
      newSet.delete(url);
      this.loadingImages = newSet;
    },
    nextImage(img) {
      if (!Array.isArray(img.urls) || img.urls.length < 2) return;
      const key = String(img.order ?? img.url ?? img.description);
      const cur = this.imageIndexes[key] || 0;
      // Vue 3 reactivity: replace object to trigger update
      this.imageIndexes = { ...this.imageIndexes, [key]: (cur + 1) % img.urls.length };
    },
    prevImage(img) {
      if (!Array.isArray(img.urls) || img.urls.length < 2) return;
      const key = String(img.order ?? img.url ?? img.description);
      const cur = this.imageIndexes[key] || 0;
      this.imageIndexes = { ...this.imageIndexes, [key]: (cur - 1 + img.urls.length) % img.urls.length };
    },
    getCurrentImage(img) {
      // For multi-image, return current image URL; else return single url
      if (Array.isArray(img.urls) && img.urls.length > 0) {
        const key = String(img.order ?? img.url ?? img.description);
        const idx = this.imageIndexes[key] || 0;
        return img.urls[idx];
      }
      return img.url;
    },
    getImageCount(img) {
      if (Array.isArray(img.urls)) return img.urls.length;
      return 1;
    },
    getCurrentIndex(img) {
      if (Array.isArray(img.urls)) {
        const key = String(img.order ?? img.url ?? img.description);
        return (this.imageIndexes[key] || 0) + 1;
      }
      return 1;
    },
    getCardStyle(img) {
      // Combine multiple unique properties for better uniqueness
      let str = String(img.order ?? '') + '|' + (img.url ?? '') + '|' + (img.description ?? '');
      // FNV-1a hash for better distribution
      let hash = 2166136261;
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
      }
      // Only left or right, 2-4 degrees
      let sign = (hash & 1) === 0 ? 1 : -1; // even: right, odd: left
      let deg = 2 + (Math.abs(hash) % 3); // 2, 3, or 4
      deg = deg * sign;
      return { transform: `rotate(${deg}deg)` };
    }
  },
  mounted() {
    fetch("data.json")
      .then(res => res.json())
      .then(data => {
        // Sort by 'order' if present, otherwise by date
        this.images = data.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        // Set loadingImages for all images (single and multi)
        let urls = [];
        this.images.forEach(img => {
          if (Array.isArray(img.urls)) {
            urls.push(...img.urls);
          } else if (img.url) {
            urls.push(img.url);
          }
        });
        this.loadingImages = new Set(urls);
        this.$forceUpdate();
      })
      .catch(err => console.error("Error loading data.json:", err));
  }
}).mount("#app");
