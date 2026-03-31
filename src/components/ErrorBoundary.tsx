import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white p-8 text-center">
          <p className="text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-sm text-white/50 mb-6">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
