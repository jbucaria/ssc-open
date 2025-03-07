// src/components/ErrorBoundary.jsx
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when an error is caught.
      return (
        <div className="p-4">
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      )
    }
    // eslint-disable-next-line react/prop-types
    return this.props.children
  }
}

export default ErrorBoundary
