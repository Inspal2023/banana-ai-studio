import React, { useState, useEffect } from 'react'
import { validateInput, ValidationOptions, ValidationResult, sanitizeInput } from '../../lib/validation'

interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  error?: string
  validationOptions?: ValidationOptions
  onValidationChange?: (result: ValidationResult) => void
  onSecureChange?: (sanitizedValue: string, originalValue: string) => void
  showValidationMessages?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function SecureInput({
  label,
  error: externalError,
  validationOptions,
  onValidationChange,
  onSecureChange,
  showValidationMessages = true,
  className = '',
  value = '',
  onChange,
  ...props
}: SecureInputProps) {
  const [internalValue, setInternalValue] = useState(value)
  const [validationResult, setValidationResult] = useState<ValidationResult>({ 
    isValid: true, 
    sanitized: String(value), 
    errors: [] 
  })
  const [touched, setTouched] = useState(false)

  // 同步外部 value 变化
  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalValue = e.target.value
    const sanitizedValue = sanitizeInput(originalValue)
    
    // 验证输入
    const result = validationOptions 
      ? validateInput(originalValue, validationOptions)
      : { isValid: true, sanitized: sanitizedValue, errors: [] }
    
    setValidationResult(result)
    setInternalValue(originalValue) // 保持原始值显示，但传递清理后的值
    
    // 通知父组件
    onValidationChange?.(result)
    onSecureChange?.(sanitizedValue, originalValue)
    onChange?.(e)
  }

  const handleBlur = () => {
    setTouched(true)
  }

  const handleFocus = () => {
    setTouched(false)
  }

  // 确定最终的错误信息
  const displayError = externalError || (touched && showValidationMessages ? validationResult.errors[0] : undefined)

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {validationOptions && validationOptions.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        {...props}
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${displayError ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          ${className}
        `}
        style={{
          // 防止自动填充时的安全问题
          backgroundColor: displayError ? '#fef2f2' : undefined
        }}
      />
      
      {displayError && showValidationMessages && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {displayError}
        </p>
      )}
      
      {showValidationMessages && !displayError && validationResult.sanitized && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          输入已清理
        </p>
      )}
    </div>
  )
}

// 安全文本区域组件
interface SecureTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string
  error?: string
  validationOptions?: ValidationOptions
  onValidationChange?: (result: ValidationResult) => void
  onSecureChange?: (sanitizedValue: string, originalValue: string) => void
  showValidationMessages?: boolean
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}

export function SecureTextarea({
  label,
  error: externalError,
  validationOptions,
  onValidationChange,
  onSecureChange,
  showValidationMessages = true,
  className = '',
  value = '',
  onChange,
  rows = 4,
  ...props
}: SecureTextareaProps) {
  const [internalValue, setInternalValue] = useState(value)
  const [validationResult, setValidationResult] = useState<ValidationResult>({ 
    isValid: true, 
    sanitized: String(value), 
    errors: [] 
  })
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const originalValue = e.target.value
    const sanitizedValue = sanitizeInput(originalValue)
    
    const result = validationOptions 
      ? validateInput(originalValue, validationOptions)
      : { isValid: true, sanitized: sanitizedValue, errors: [] }
    
    setValidationResult(result)
    setInternalValue(originalValue)
    
    onValidationChange?.(result)
    onSecureChange?.(sanitizedValue, originalValue)
    onChange?.(e)
  }

  const handleBlur = () => setTouched(true)
  const handleFocus = () => setTouched(false)

  const displayError = externalError || (touched && showValidationMessages ? validationResult.errors[0] : undefined)

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {validationOptions && validationOptions.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <textarea
        {...props}
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        rows={rows}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-vertical
          ${displayError ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          ${className}
        `}
      />
      
      {displayError && showValidationMessages && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {displayError}
        </p>
      )}
      
      {showValidationMessages && !displayError && validationResult.sanitized && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          输入已清理
        </p>
      )}
    </div>
  )
}

// 安全选择组件
interface SecureSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string
  error?: string
  validationOptions?: ValidationOptions
  onValidationChange?: (result: ValidationResult) => void
  onSecureChange?: (sanitizedValue: string, originalValue: string) => void
  showValidationMessages?: boolean
  children: React.ReactNode
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function SecureSelect({
  label,
  error: externalError,
  validationOptions,
  onValidationChange,
  onSecureChange,
  showValidationMessages = true,
  className = '',
  value = '',
  onChange,
  children,
  ...props
}: SecureSelectProps) {
  const [internalValue, setInternalValue] = useState(value)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const originalValue = e.target.value
    const sanitizedValue = sanitizeInput(originalValue)
    
    // 对于选择框，主要检查是否为空值和长度
    let result: ValidationResult
    if (validationOptions) {
      result = validateInput(originalValue, validationOptions)
    } else {
      result = {
        isValid: true,
        sanitized: sanitizedValue,
        errors: []
      }
    }
    
    setInternalValue(originalValue)
    
    onValidationChange?.(result)
    onSecureChange?.(sanitizedValue, originalValue)
    onChange?.(e)
  }

  const handleBlur = () => setTouched(true)
  const handleFocus = () => setTouched(false)

  const displayError = externalError || (touched && showValidationMessages ? '请选择一个选项' : undefined)

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {validationOptions && validationOptions.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        {...props}
        value={internalValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          ${displayError ? 'border-red-300 bg-red-50' : 'border-gray-300'}
          ${className}
        `}
      >
        {children}
      </select>
      
      {displayError && showValidationMessages && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {displayError}
        </p>
      )}
    </div>
  )
}