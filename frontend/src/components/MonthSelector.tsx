import { useState } from 'react';
import './MonthSelector.css';

interface MonthOption {
    year: number;
    month: number;
    label: string;
}

interface MonthSelectorProps {
    selectedYear: number;
    selectedMonth: number;
    createdAt: string;
    onChange: (year: number, month: number) => void;
}

function getAvailableMonths(createdAt: string, today = new Date()): MonthOption[] {
    const createdDate = new Date(createdAt);

    let year = today.getFullYear();
    let month = today.getMonth();

    const startYear = createdDate.getFullYear();
    const startMonth = createdDate.getMonth();

    const months: MonthOption[] = [];

    while (
        year > startYear ||
        (year === startYear && month >= startMonth)
    ) {
        months.push({
            year,
            month: month + 1,
            label: new Date(year, month, 1).toLocaleDateString(
                'en-US',
                {
                    month: 'long',
                    year: 'numeric',
                },
            ),
        });

        month -= 1;

        if (month < 0) {
            month = 11;
            year -= 1;
        }
    }

    return months;
}

export function MonthSelector({
    selectedYear,
    selectedMonth,
    createdAt,
    onChange,
}: MonthSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const months = getAvailableMonths(createdAt);

    const selectedLabel =
        months.find(
            (month) =>
                month.year === selectedYear &&
                month.month === selectedMonth,
        )?.label ?? '';

    function handleSelect(year: number, month: number) {
        onChange(year, month);
        setIsOpen(false);
    }

    return (
        <div className={`month-selector${isOpen ? ' open' : ''}`}>
            <button
                type="button"
                className="month-selector-trigger"
                onClick={() => setIsOpen((open) => !open)}
            >
                <span>{selectedLabel}</span>
                <span className="month-selector-arrow">
                    {isOpen ? '▲' : '▼'}
                </span>
            </button>

            {isOpen && (
                <div className="month-selector-menu">
                    {months.map((option) => (
                        <button
                            type="button"
                            key={`${option.year}-${option.month}`}
                            className={`month-selector-option ${option.year === selectedYear &&
                                    option.month === selectedMonth
                                    ? 'active'
                                    : ''
                                }`}
                            onClick={() =>
                                handleSelect(option.year, option.month)
                            }
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}