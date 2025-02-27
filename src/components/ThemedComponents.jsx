/* eslint-disable react/prop-types */
// src/components/ThemedComponents.js

import classNames from 'classnames'
import './ThemedComponents.css'

export function ThemedView({
  styleType = 'default',
  children,
  className,
  ...props
}) {
  const styleMap = {
    default: 'themed-view-default',
    dark: 'themed-view-dark',
    gold: 'themed-view-gold',
    primary: 'themed-view-primary',
    secondary: 'themed-view-secondary',
    success: 'themed-view-success',
    danger: 'themed-view-danger',
  }

  return (
    <div
      className={classNames('themed-view', styleMap[styleType], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function ThemedText({
  styleType = 'default',
  children,
  className,
  as = 'p',
  ...props
}) {
  const Component = as
  const styleMap = {
    default: 'themed-text-default',
    dark: 'themed-text-dark',
    gold: 'themed-text-gold',
    primary: 'themed-text-primary',
    secondary: 'themed-text-secondary',
    success: 'themed-text-success',
    danger: 'themed-text-danger',
  }

  return (
    <Component
      className={classNames(styleMap[styleType], className)}
      {...props}
    >
      {children}
    </Component>
  )
}

export function ThemedButton({
  styleType = 'default',
  children,
  className,
  disabled,
  onClick,
  ...props
}) {
  const styleMap = {
    default: 'themed-button-default',
    dark: 'themed-button-dark',
    gold: 'themed-button-gold',
    primary: 'themed-button-primary',
    secondary: 'themed-button-secondary',
    success: 'themed-button-success',
    danger: 'themed-button-danger',
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={classNames('themed-button', styleMap[styleType], className)}
      {...props}
    >
      {children}
    </button>
  )
}

export function ThemedHeader({
  styleType = 'default',
  children,
  className,
  ...props
}) {
  const styleMap = {
    default: 'themed-header-default',
    dark: 'themed-header-dark',
    gold: 'themed-header-gold',
    primary: 'themed-header-primary',
    secondary: 'themed-header-secondary',
    success: 'themed-header-success',
    danger: 'themed-header-danger',
  }

  return (
    <header
      className={classNames('themed-header', styleMap[styleType], className)}
      {...props}
    >
      {children}
    </header>
  )
}
