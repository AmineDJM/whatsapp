import { Component, ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('[WhatsApp Clone] runtime error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="h-full overflow-auto bg-wa-bg p-6 text-wa-text">
          <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-5 space-y-3">
            <div className="text-lg font-semibold text-red-600">Something went wrong</div>
            <p className="text-sm text-wa-sub">The app hit a runtime error. Details below — send me this text.</p>
            <pre className="bg-gray-100 rounded p-3 text-xs overflow-auto whitespace-pre-wrap">
{String(this.state.error?.message ?? this.state.error)}
{'\n\n'}
{this.state.error?.stack}
            </pre>
            <button onClick={() => { this.setState({ error: null }); location.href = '/' }}
              className="w-full bg-wa-green text-white font-medium py-2.5 rounded-lg">Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
