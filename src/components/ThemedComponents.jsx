/* eslint-disable react/prop-types */
// src/components/ThemedComponents.js
// eslint-disable-next-line no-unused-vars
import React from 'react'
import classNames from 'classnames'

export function ThemedView({
  styleType = 'default',
  children,
  className,
  ...props
}) {
  const styleMap = {
    default: 'bg-white text-black',
    dark: 'bg-black text-white',
    gold: 'bg-yellow-400 text-black',
    primary: 'bg-gray-800 text-white',
    secondary: 'bg-gray-100 text-black',
    success: 'bg-green-100 text-green-800',
    danger: 'bg-red-100 text-red-800',
  }

  return (
    <div className={classNames(styleMap[styleType], className)} {...props}>
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
    default: 'text-black',
    dark: 'text-white',
    gold: 'text-yellow-400',
    primary: 'text-gray-800',
    secondary: 'text-gray-600',
    success: 'text-green-800',
    danger: 'text-red-800',
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
    default: 'bg-gray-800 text-white',
    dark: 'bg-black text-white',
    gold: 'bg-yellow-400 text-black',
    primary: 'bg-black text-white',
    secondary: 'bg-gray-100 text-gray-800 border border-gray-300',
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white',
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        'rounded px-4 py-2 font-semibold hover:opacity-90 active:scale-95 disabled:opacity-50',
        styleMap[styleType],
        className
      )}
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
    default: 'bg-white text-black shadow',
    dark: 'bg-black text-white shadow',
    gold: 'bg-yellow-400 text-black shadow',
    primary: 'bg-gray-800 text-white shadow',
    secondary: 'bg-gray-100 text-black',
    success: 'bg-green-600 text-white shadow',
    danger: 'bg-red-600 text-white shadow',
  }

  return (
    <header
      className={classNames(styleMap[styleType], className, 'p-4')}
      {...props}
    >
      {children}
    </header>
  )
}
