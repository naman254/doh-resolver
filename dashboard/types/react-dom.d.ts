declare module 'react-dom' {
  export function useFormState<State, Payload>(
    action: (state: State, payload: Payload) => State | Promise<State>,
    initialState: State,
    permalink?: string
  ): [State, (payload: Payload) => void]

  export function useFormStatus(): {
    pending: boolean
    data: FormData | null
    method: string | null
    action: string | null
  }
}