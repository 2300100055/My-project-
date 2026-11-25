"""Custom error types."""
from dataclasses import dataclass


@dataclass
class VerityError(Exception):
    code: str
    message: str
    status_code: int = 400


class FileTooLargeError(VerityError):
    def __init__(self, max_mb: int) -> None:
        super().__init__(
            code="FILE_TOO_LARGE",
            message=f"File exceeds maximum allowed size of {max_mb} MB.",
            status_code=413,
        )


class UnsupportedFileTypeError(VerityError):
    def __init__(self, detected: str) -> None:
        super().__init__(
            code="UNSUPPORTED_FILE_TYPE",
            message=f"File type '{detected}' is not supported. Upload JPG, PNG, WEBP, GIF, HEIC, MP4, MOV, or WEBM.",
            status_code=415,
        )


class CorruptFileError(VerityError):
    def __init__(self) -> None:
        super().__init__(
            code="CORRUPT_FILE",
            message="The uploaded file appears to be corrupt or malformed.",
            status_code=422,
        )


class JobNotFoundError(VerityError):
    def __init__(self, job_id: str) -> None:
        super().__init__(
            code="JOB_NOT_FOUND",
            message=f"Job '{job_id}' was not found. It may have expired (results auto-delete after 60 minutes).",
            status_code=404,
        )


class DecompressionBombError(VerityError):
    def __init__(self) -> None:
        super().__init__(
            code="DECOMPRESSION_BOMB",
            message="Image dimensions are too large.",
            status_code=422,
        )
