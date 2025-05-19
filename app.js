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
        const matchesTag = this.activeTag ? img.tag === this.activeTag : true;
        return matchesSearch && matchesTag;
      });
    },
    uniqueTags() {
      return [...new Set(this.images.map(img => img.tag))];
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
        this.images = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        // Set loadingImages immediately so spinner shows as soon as possible
        this.loadingImages = new Set(this.images.map(img => img.url));
        this.$forceUpdate();
      })
      .catch(err => console.error("Error loading data.json:", err));
  }
}).mount("#app");
