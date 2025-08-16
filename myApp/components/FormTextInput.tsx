import * as React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label?: string;
  errorText?: string;
};

const FormTextInput = React.forwardRef<TextInput, Props>(
  ({ label, errorText, style, ...rest }, ref) => {
    return (
      <View style={styles.container}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          style={[styles.input, errorText ? styles.inputError : null, style]}
          placeholderTextColor="#9aa0a6"
          {...rest}
        />
        {!!errorText && <Text style={styles.error}>{errorText}</Text>}
      </View>
    );
  }
);

FormTextInput.displayName = 'FormTextInput';
export default FormTextInput;

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { marginBottom: 6, fontSize: 14, color: '#FFFFFF' },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, backgroundColor: 'white'
  },
  inputError: { borderColor: '#ef4444' },
  error: { marginTop: 6, color: '#ef4444', fontSize: 12 }
});
