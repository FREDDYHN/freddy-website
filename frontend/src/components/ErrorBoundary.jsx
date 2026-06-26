import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] React render error:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
          <div className="text-center px-4 py-16">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">页面出了点问题</h1>
            <p className="text-sm text-gray-500 mb-6">已自动记录错误，请刷新页面重试</p>
            <button onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-white rounded-lg font-medium">
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
