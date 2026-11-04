<template>
  <div class="contact-page container fade-in">
    <div class="contact-header">
      <span class="section-label">Contact</span>
      <h1>Get in touch</h1>
      <p class="lead">Have a question, found a bug, or want to contribute? We'd love to hear from you.</p>
    </div>

    <div class="contact-grid">
      <form class="contact-form card" @submit.prevent="handleSubmit">
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name</label>
            <input id="name" v-model="form.name" type="text" required placeholder="Your name" />
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input id="email" v-model="form.email" type="email" required placeholder="you@example.com" />
          </div>
        </div>
        <div class="form-group">
          <label for="subject">Subject</label>
          <input id="subject" v-model="form.subject" type="text" required placeholder="What's this about?" />
        </div>
        <div class="form-group">
          <label for="message">Message</label>
          <textarea id="message" v-model="form.message" rows="5" required placeholder="Tell us more..."></textarea>
        </div>
        <p v-if="submitted" class="success">Message sent! We'll get back to you soon.</p>
        <button type="submit" class="btn btn-primary">Send Message</button>
      </form>

      <div class="contact-info">
        <div class="info-card card">
          <h4>GitHub</h4>
          <p>Report issues, request features, or contribute code.</p>
          <a href="#">github.com/smarthome-hub</a>
        </div>
        <div class="info-card card">
          <h4>Documentation</h4>
          <p>Check the docs for API references and setup guides.</p>
          <a href="#">docs.smarthome-hub.io</a>
        </div>
        <div class="info-card card">
          <h4>Community</h4>
          <p>Join the discussion on our community forum.</p>
          <a href="#">community.smarthome-hub.io</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const submitted = ref(false)

function handleSubmit() {
  // In production, POST to the backend contact endpoint
  submitted.value = true
  setTimeout(() => (submitted.value = false), 5000)
}
</script>

<style scoped>
.contact-page {
  padding-top:4rem;
  padding-bottom:4rem;
}

.contact-header {
  max-width:600px;
  margin-bottom:3rem;
}

.section-label {
  display:inline-block;
  color:var(--c-accent);
  font-size:0.8rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.5px;
  margin-bottom:0.5rem;
}

.contact-header h1 {
  font-size:2.25rem;
  font-weight:800;
  margin-bottom:0.75rem;
  color:var(--c-text);
}

.lead {
  color:var(--c-muted);
  font-size:1rem;
  line-height:1.6;
}

.contact-grid {
  display:grid;
  grid-template-columns:1fr 320px;
  gap:2rem;
  align-items:start;
}

.contact-form {
  padding:2rem;
}

.form-row {
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:1rem;
}

.form-group {
  margin-bottom:1rem;
}

.form-group label {
  display:block;
  font-size:0.85rem;
  font-weight:600;
  margin-bottom:0.35rem;
  color:var(--c-text);
}

.form-group input,
.form-group textarea {
  width:100%;
  padding:0.6rem 0.75rem;
  border:1px solid var(--c-border);
  border-radius:8px;
  font-size:0.9rem;
  transition:border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline:none;
  border-color:var(--c-accent);
  box-shadow:0 0 0 3px rgba(9, 105, 218, 0.1);
}

.success {
  color:var(--c-ok-text);
  background:var(--c-ok-bg);
  padding:0.5rem 0.75rem;
  border-radius:6px;
  font-size:0.85rem;
  margin-bottom:1rem;
}

.contact-info {
  display:flex;
  flex-direction:column;
  gap:1rem;
}

.info-card {
  padding:1.25rem;
}

.info-card h4 {
  font-size:0.95rem;
  font-weight:700;
  margin-bottom:0.3rem;
}

.info-card p {
  color:var(--c-muted);
  font-size:0.85rem;
  line-height:1.5;
  margin-bottom:0.5rem;
}

.info-card a {
  font-size:0.85rem;
  color:var(--c-accent);
}

@media (max-width: 768px) {
  .contact-grid { grid-template-columns:1fr; }
  .form-row { grid-template-columns:1fr; }
}
</style>
