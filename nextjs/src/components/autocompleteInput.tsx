"use client";

import { resolveAutocompleteUrl } from '@/app/helper/url/resolveUrl';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import axios from 'axios';
import { useState, useRef } from 'react';

type AutocompleteInputProps = {
  suburl: string;
  name: string;
  label: string;
  multiple?: boolean;
};

type User = {
  id: number;
  name: string;
}

export default function AutocompleteInput({ suburl, name, label, multiple = false }: AutocompleteInputProps) {
  const [options, setOptions] = useState<readonly User[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<null | readonly User[]>([])

  async function handleInputChange(
    event: React.SyntheticEvent<Element, Event> | undefined,
    value: string
  ) {
    setInputValue(value);
    setLoading(true);

    if (!value) {
      setOptions([]);
      setLoading(false);
      return;
    }
    debouncedFetch.current(value);
  }

  function handleChange(
    event: React.SyntheticEvent<Element, Event> | undefined,
    value: readonly User[] | User | null
  ) {
    if (value !== null && !Array.isArray(value)) {
      let valueArr = [value];
      setSelectedOptions(valueArr as readonly User[]);
      return;
    }
    setSelectedOptions(value as readonly User[]);
  }

  function debounce<T extends (...args: any[]) => any>(func: T, delay: number) {
    let timeout: ReturnType<typeof setTimeout>;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  }

  const debouncedFetch = useRef(
    debounce(async (value: string) => {
      const users = await axios
        .get(resolveAutocompleteUrl(`v1/autocomplete/${suburl}?query=${value}`))
        .then(res => {
          if (suburl == "user" || suburl == "site") {
            return res.data.result;
          } else {
            return res.data
          }
        }
        );

      setOptions(users);
      setLoading(false);
    }, 300)
  );


  return (
    <>
      <Autocomplete
        options={options}
        loading={loading}
        multiple={multiple}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleChange}
        filterOptions={(x) => x}
        getOptionLabel={(option) => option.name}
        renderInput={(params) => (
          <TextField {...params} label={label} name="not used"></TextField>
        )}
      />
      {selectedOptions !== null && Array.isArray(selectedOptions) &&
        selectedOptions.map((option, index) => (
          <input
            key={index}
            type="hidden"
            name={name}
            value={option.id}
          />
        ))
      }
    </>
  );
}
