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
  value: number;
  onChange: (value: number) => void;
}

const Selection = ({ fieldName, value, onChange }: SelectionProps) => {
  // Determine options based on field name
  const options = fieldName === "stake" ? STAKES : WARDS;
  const stringValue = value ? value.toString() : "";
  const handleValueChange = (newValue: string) => {
    onChange(Number(newValue));
  };

  return (
    <Select value={stringValue} onValueChange={handleValueChange}>
      <SelectTrigger className="form-input">
        <SelectValue placeholder={`Select ${fieldName}`} />
      </SelectTrigger>
      <SelectContent className="form-input">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value.toString()}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default Selection
