'use client'

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STAKES, WARDS } from '@/constants'

interface SelectionProps {
  fieldName: string;
  value: string;
  onChange: (value: string) => void;
}

const Selection = ({ fieldName, value, onChange }: SelectionProps) => {
  // Determine options based on field name
  const options = fieldName === "stake" ? STAKES : WARDS;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="form-input">
        <SelectValue placeholder={`Select ${fieldName}`} />
      </SelectTrigger>
      <SelectContent className="form-input">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default Selection
