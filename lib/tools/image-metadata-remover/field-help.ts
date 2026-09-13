// Short explanations for the bounded set of metadata tags shown by the inspector.
export const fieldHelp: Record<string, { ko: string; en: string; ja: string }> = {
  Make: { ko: "기기 제조사", en: "Device manufacturer", ja: "機器メーカー" },
  Model: { ko: "카메라 또는 휴대전화 모델", en: "Camera or phone model", ja: "カメラ・スマートフォンの機種" },
  LensMake: { ko: "렌즈 제조사", en: "Lens manufacturer", ja: "レンズメーカー" },
  LensModel: { ko: "렌즈 모델", en: "Lens model", ja: "レンズの機種" },
  BodySerialNumber: { ko: "카메라 본체 일련번호", en: "Camera body serial number", ja: "カメラ本体の製造番号" },
  LensSerialNumber: { ko: "렌즈 일련번호", en: "Lens serial number", ja: "レンズの製造番号" },
  DateTimeOriginal: { ko: "원본 사진의 촬영 시각", en: "Original capture date and time", ja: "元の写真の撮影日時" },
  CreateDate: { ko: "이미지 데이터가 생성된 시각", en: "Image data creation date and time", ja: "画像データの作成日時" },
  ModifyDate: { ko: "이미지 데이터의 수정 시각", en: "Image data modification date and time", ja: "画像データの更新日時" },
  Software: { ko: "저장 또는 편집에 사용된 소프트웨어", en: "Software used to save or edit the image", ja: "保存・編集に使われたソフトウェア" },
  Artist: { ko: "촬영자 또는 작성자", en: "Photographer or creator", ja: "撮影者・作成者" },
  Creator: { ko: "콘텐츠 작성자", en: "Content creator", ja: "コンテンツの作成者" },
  Copyright: { ko: "저작권 표기", en: "Copyright notice", ja: "著作権表示" },
  ImageDescription: { ko: "이미지에 기록된 설명", en: "Description stored in the image", ja: "画像に記録された説明" },
  UserComment: { ko: "사진에 추가된 사용자 메모", en: "User comment attached to the photo", ja: "写真に付けられたコメント" },
  ExposureTime: { ko: "셔터가 열린 시간(초)", en: "Shutter-open time in seconds", ja: "シャッターが開いていた時間（秒）" },
  FNumber: { ko: "조리개 값(작을수록 더 개방)", en: "Aperture f-number; smaller means wider", ja: "絞り値（小さいほど開放）" },
  ISO: { ko: "촬영 감도 설정", en: "Camera sensitivity setting", ja: "撮影感度の設定" },
  FocalLength: { ko: "렌즈의 실제 초점 거리", en: "Actual lens focal length", ja: "レンズの実焦点距離" },
  ExposureProgram: { ko: "자동·수동 등 노출 프로그램", en: "Exposure program, such as auto or manual", ja: "自動・手動などの露出プログラム" },
  ExposureBiasValue: { ko: "노출 보정 값", en: "Exposure compensation value", ja: "露出補正値" },
  Flash: { ko: "플래시 상태 또는 설정", en: "Flash status or setting", ja: "フラッシュの状態・設定" },
  WhiteBalance: { ko: "색온도를 맞추는 화이트밸런스 설정", en: "White balance color setting", ja: "色温度を調整するホワイトバランス設定" },
  Orientation: { ko: "사진 표시·회전 방향", en: "Image display orientation", ja: "画像の表示・回転方向" },
  ColorSpace: { ko: "기록된 색 공간", en: "Recorded color space", ja: "記録された色空間" },
  PixelXDimension: { ko: "기록된 가로 픽셀 수", en: "Recorded pixel width", ja: "記録された横の画素数" },
  PixelYDimension: { ko: "기록된 세로 픽셀 수", en: "Recorded pixel height", ja: "記録された縦の画素数" },
  GPSAltitude: { ko: "기록된 고도 정보", en: "Recorded altitude", ja: "記録された高度情報" },
  latitude: { ko: "촬영 위치의 위도", en: "Latitude of the recorded location", ja: "記録された位置の緯度" },
  longitude: { ko: "촬영 위치의 경도", en: "Longitude of the recorded location", ja: "記録された位置の経度" },
};

export function fieldDescription(tag: string, locale: string): string | undefined {
  const item = fieldHelp[tag];
  return item?.[locale as keyof typeof item] ?? item?.en;
}
