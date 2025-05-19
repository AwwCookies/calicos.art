Vue.createApp({
  data() {
    return {
      images: [],
      search: '',
      activeTag: '',
      loadingImages: new Set()
    };
  },
  computed: {
    filteredImages() {
      return this.images.filter(img => {
        const matchesSearch = img.description.toLowerCase().includes(this.search.toLowerCase());
        // Support multiple tags per image (comma or array)
        let tags = img.tag;
        if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim()).filter(Boolean);
        if (!Array.isArray(tags)) tags = [];
        const matchesTag = this.activeTag ? tags.includes(this.activeTag) : true;
        return matchesSearch && matchesTag;
      });
    },
    uniqueTags() {
      // Collect all tags from all images, flatten, dedupe
      const tagSet = new Set();
      this.images.forEach(img => {
        let tags = img.tag;
        if (typeof tags === 'string') tags = tags.split(',').map(t => t.trim()).filter(Boolean);
        if (Array.isArray(tags)) tags.forEach(t => tagSet.add(t));
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
        // Set loadingImages immediately so spinner shows as soon as possible
        this.loadingImages = new Set(this.images.map(img => img.url));
        this.$forceUpdate();
      })
      .catch(err => console.error("Error loading data.json:", err));
  }
}).mount("#app");
