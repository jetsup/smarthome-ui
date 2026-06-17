import { defineStore } from 'pinia'
import api from '../services/api'

export const useGatewayStore = defineStore('gateways', {
  state: () => ({
    gateways: [],
    currentGateway: null,
    loading: false,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      try {
        const { data } = await api.get('/gateways')
        this.gateways = data
      } finally {
        this.loading = false
      }
    },

    async fetchOne(id) {
      this.loading = true
      try {
        const { data } = await api.get(`/gateways/${id}`)
        this.currentGateway = data
      } finally {
        this.loading = false
      }
    },

    async create(name) {
      const { data } = await api.post('/gateways', { name })
      this.gateways.push(data)
      return data
    },

    async remove(id) {
      await api.delete(`/gateways/${id}`)
      this.gateways = this.gateways.filter((g) => g.id !== id)
    },

    async fetchNodes(gatewayId) {
      const { data } = await api.get(`/gateways/${gatewayId}/nodes`)
      return data
    },

    async startScan(gatewayId) {
      const { data } = await api.post(`/gateways/${gatewayId}/scan`)
      return data
    },

    async fetchDiscovered(gatewayId) {
      const { data } = await api.get(`/gateways/${gatewayId}/discovered`)
      return data
    },

    async provisionNode(gatewayId, deviceId, force) {
      const { data } = await api.post(`/gateways/${gatewayId}/provision`, { deviceId, force: !!force })
      return data
    },
  },
})
