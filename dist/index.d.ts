type ParsedFrame = {
    file: string;
    line: number;
};
type FormatterInput = {
    location: string;
    label?: string;
    value: unknown;
    formattedValue: unknown;
};
type FormatterOutput = {
    locationLine: unknown;
    valueLine: unknown;
};
type LogOptions = {
    colors?: boolean;
    formatter?: (input: FormatterInput) => FormatterOutput;
};
declare function parseFrameLine(frame: string): ParsedFrame | null;
declare function getCallerFromStack(stack?: string): ParsedFrame;
declare function isLogOptions(value: unknown): value is LogOptions;
declare function formatLabeledValue(label: string | undefined, formattedValue: unknown): unknown;
declare function log(value: unknown, options?: LogOptions): void;
declare function log(label: string, value: unknown, options?: LogOptions): void;
declare const __internal: {
    getCallerFromStack: typeof getCallerFromStack;
    parseFrameLine: typeof parseFrameLine;
    formatLabeledValue: typeof formatLabeledValue;
    isLogOptions: typeof isLogOptions;
};

export { type FormatterInput, type FormatterOutput, type LogOptions, __internal, log };
