from pydantic import BaseModel


class ExchangeRateResponse(BaseModel):
    exchange_rate: str


class SettingResponse(BaseModel):
    key: str
    value: str


class UpdateSettingRequest(BaseModel):
    value: str


class SettingsListResponse(BaseModel):
    settings: list[SettingResponse]
