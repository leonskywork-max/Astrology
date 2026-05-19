declare module 'tz-lookup' {
  /**
   * Возвращает IANA timezone (например, "Europe/Moscow") по координатам.
   * Бросает RangeError при невалидных координатах.
   */
  function tzLookup(latitude: number, longitude: number): string;
  export default tzLookup;
}
